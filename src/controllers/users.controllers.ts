import { NextFunction, Request, Response } from 'express'
import usersService from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import {
  ChangePasswordReqBody,
  FollowReqBody,
  ForgotPasswordReqBody,
  GetProfileReqParams,
  LoginReqBody,
  LogoutReqBody,
  RefreshTokenReqBody,
  RegisterReqBody,
  ResetPasswordReqBody,
  TokenPayload,
  UnfollowReqParams,
  UpdateMeReqBody,
  VerifyEmailReqBody,
  VerifyForgotPasswordTokenReqBody,
  emailVerifyReqBody
} from '~/models/requests/User.reques'
import User from '~/models/schemas/User.schema'
import { ObjectId } from 'mongodb'
import { USERS_MESSAGES } from '~/constants/message'
import databaseService from '~/services/database.severvices'
import { NOTFOUND } from 'dns'
import HTTP_STATUS from '~/constants/httpStatus'
import { UserVerifyStatus } from '~/constants/enums'
export const loginController = async (req: Request<ParamsDictionary, any, LoginReqBody>, res: Response) => {
  // throw new Error('test error') // test error
  //vào req.user để lấy thông tin user đó ra
  //dùng cái user_id để tạo token và refresh token
  const user = req.user as User //lấy user từ req.user
  const user_id = user._id as ObjectId //lấy id từ user
  const result = await usersService.login({
    user_id: user_id.toString(),
    verify: user.verify
  }) //gọi hàm login từ service để tạo token và refresh token
  //nếu không bug gì thì thành công luôn
  return res.status(200).json({
    message: USERS_MESSAGES.LOGIN_SUCCESS,
    result
  })
}

//route này nhận vào email, password và tạo tài khoản cho mình
//nhưng trong lúc tạo tài khoản ta dùng insertOne(là 1 promise)
//nên ta sẽ dùng async await để xử lý bất đồng bộ
export const registerController = async (
  req: Request<ParamsDictionary, any, RegisterReqBody>,
  res: Response,
  next: NextFunction
) => {
  // throw new Error('test error') // test error
  const result = await usersService.register(req.body) //await để đợi kết quả trả về
  // console.log(result) //in ra kết quả

  return res.status(201).json({
    message: USERS_MESSAGES.REGISTER_SUCCESS,
    result
  }) //trả về kết quả
} //nếu có lỗi thì nó sẽ bị catch ở dưới

export const logoutController = async (req: Request<ParamsDictionary, any, LogoutReqBody>, res: Response) => {
  //lấy refresh token từ req.body
  const refresh_token = req.body.refresh_token as string
  //gọi hàm logout, hàm nhận vào refresh token tìm và xoá
  const result = await usersService.logout(refresh_token)
  res.json(result)
  // res.json({
  //   message: 'logout successfully'
  // })
}

export const emailVerifyController = async (req: Request<ParamsDictionary, any, emailVerifyReqBody>, res: Response) => {
  //khi mà req vào được đây nghĩa là email token đã valid
  //đồng thời trong req sẽ có decoded email_verify_token
  const { user_id } = req.decoded_email_verify_token as TokenPayload
  //tìm xem có user có mã này hay không
  const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
  if (user === null) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  }
  //nếu mà email_verify_token là rỗng: tức là account đã đc verify email trước đó rồi
  if (user.email_verify_token === ' ') {
    //mặc định status code là 200
    return res.json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
    })
  }
  const result = await usersService.verifyEmail(user_id)
  //để cập nhật lại email_verify_token thành rỗng và tạo ra access token và refresh token
  //gửi cho người vừa request email verify đăng nhập luôn
  return res.json({
    message: USERS_MESSAGES.EMAIL_VERIFY_SUCCESS,
    result: result
  })
}
export const resendEmailVerifyController = async (
  req: Request<ParamsDictionary, any, VerifyEmailReqBody>,
  res: Response,
  next: NextFunction
) => {
  //khi đến đây thì accesstokenValidator đã chạy rồi => access_token đã đc decode
  //và lưu vào req.user, nên trong đó sẽ có user._id để tao sử dụng
  const { user_id } = req.decoded_authorization as TokenPayload //lấy user_id từ decoded_authorization
  //từ user_id này ta sẽ tìm user trong database
  const user = await databaseService.users.findOne({
    _id: new ObjectId(user_id)
  })
  //nếu k có user thì trả về lỗi 404: not found
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  }
  //nếu user đã verify email trước đó rồi thì trả về lỗi 400: bad request
  if (user.verify == UserVerifyStatus.Verified) {
    return res.json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
    })
  }
  //nếu user chưa verify email thì ta sẽ gữi lại email verify cho họ
  //cập nhật email_verify_token mới và gữi lại email verify cho họ
  const result = await usersService.resendEmailVerify(user_id)
  //result chứa message nên ta chỉ cần trả  result về cho client
  return res.json(result)
}

export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, ForgotPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  //middleware forgotPasswordValidator đã chạy rồi, nên ta có thể lấy _id từ user đã tìm đc bằng email
  const { _id, verify } = req.user as User
  const result = await usersService.forgotPassword({ user_id: (_id as ObjectId).toString(), verify })
  return res.json(result)
}

export const verifyForgotPasswordTokenController = async (
  req: Request<ParamsDictionary, any, VerifyForgotPasswordTokenReqBody>,
  res: Response,
  next: NextFunction
) => {
  //nếu đã đến bước này nghĩa là ta đã tìm có forgot_password_token hợp lệ
  //và đã lưu vào req.decoded_forgot_password_token
  //thông tin của user
  //ta chỉ cần thông báo rằng token hợp lệ
  return res.json({
    message: USERS_MESSAGES.VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS
  })
}
//trong messages.ts thêm   VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS: 'Verify forgot password token success'
export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  //middleware resetPasswordValidator đã chạy rồi, nên ta có thể lấy đc user_id từ decoded_forgot_password_token
  const { user_id } = req.decoded_forgot_password_token as TokenPayload
  const { password } = req.body
  //vào database tìm user thông qua user_id này và cập nhật lại password mới
  //vì vào database nên ta sẽ code ở user.services
  const result = await usersService.resetPassword(user_id, password) //ta chưa code resetPassword
  return res.json(result)
}
export const getMeController = async (req: Request, res: Response, next: NextFunction) => {
  //middleware accessTokenValidator đã chạy rồi, nên ta có thể lấy đc user_id từ decoded_authorization
  const { user_id } = req.decoded_authorization as TokenPayload
  //tìm user thông qua user_id này và trả về user đó
  //truy cập vào database nên ta sẽ code ở user.services
  const user = await usersService.getMe(user_id) // hàm này ta chưa code, nhưng nó dùng user_id tìm user và trả ra user đó
  return res.json({
    message: USERS_MESSAGES.GET_ME_SUCCESS,
    result: user
  })
}

export const updateMeController = async (
  req: Request<ParamsDictionary, any, UpdateMeReqBody>,
  res: Response,
  next: NextFunction
) => {
  //middleware accessTokenValidator đã chạy rồi, nên ta có thể lấy đc user_id từ decoded_authorization
  const { user_id } = req.decoded_authorization as TokenPayload
  //user_id để biết phải cập nhật ai
  //lấy thông tin mới từ req.body
  const { body } = req
  //lấy các property mà client muốn cập nhật
  //ta sẽ viết hàm updateMe trong user.services
  //nhận vào user_id và body để cập nhật
  const result = await usersService.updateMe(user_id, body)
  return res.json({
    message: USERS_MESSAGES.UPDATE_ME_SUCCESS, //meesage.ts thêm  UPDATE_ME_SUCCESS: 'Update me success'
    result
  })
}
//trong messages.ts thêm GET_ME_SUCCESS: 'Get me success'

export const getProfileController = async (req: Request<GetProfileReqParams>, res: Response, next: NextFunction) => {
  const { username } = req.params //lấy username từ query params
  const result = await usersService.getProfile(username)
  return res.json({
    message: USERS_MESSAGES.GET_PROFILE_SUCCESS, //message.ts thêm  GET_PROFILE_SUCCESS: 'Get profile success',
    result
  })
}
export const followController = async (
  req: Request<ParamsDictionary, any, FollowReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload //lấy user_id từ decoded_authorization của access_token
  const { followed_user_id } = req.body //lấy followed_user_id từ req.body
  const result = await usersService.follow(user_id, followed_user_id) //chưa có method này
  return res.json(result)
}

export const unfollowController = async (req: Request<UnfollowReqParams>, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload //lấy user_id từ decoded_authorization của access_token
  const { user_id: followed_user_id } = req.params //lấy user_id từ req.params là user_id của người mà ngta muốn unfollow
  const result = await usersService.unfollow(user_id, followed_user_id) //unfollow chưa làm
  return res.json(result)
}
export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload //lấy user_id từ decoded_authorization của access_token
  const { password } = req.body //lấy old_password và password từ req.body
  const result = await usersService.changePassword(user_id, password) //chưa code changePassword
  return res.json(result)
}
export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenReqBody>,
  res: Response,
  next: NextFunction
) => {
  // khi qua middleware refreshTokenValidator thì ta đã có decoded_refresh_token
  //chứa user_id và token_type
  //ta sẽ lấy user_id để tạo ra access_token và refresh_token mới
  const { user_id, verify } = req.decoded_refresh_token as TokenPayload //lấy refresh_token từ req.body
  const { refresh_token } = req.body
  const result = await usersService.refreshToken(user_id, verify, refresh_token) //refreshToken chưa code
  return res.json({
    message: USERS_MESSAGES.REFRESH_TOKEN_SUCCESS, //message.ts thêm  REFRESH_TOKEN_SUCCESS: 'Refresh token success',
    result
  })
}
//usersService.getProfile(username) nhận vào username tìm và return ra ngoài, hàm này chưa viết
//giờ ta sẽ viết
