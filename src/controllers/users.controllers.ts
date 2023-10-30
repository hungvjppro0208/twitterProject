import { NextFunction, Request, Response } from 'express'
import usersService from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import { LogoutReqBody, RegisterReqBody, TokenPayload, emailVerifyReqBody } from '~/models/requests/User.reques'
import User from '~/models/schemas/User.schema'
import { ObjectId } from 'mongodb'
import { USERS_MESSAGES } from '~/constants/message'
import databaseService from '~/services/database.severvices'
import { NOTFOUND } from 'dns'
import HTTP_STATUS from '~/constants/httpStatus'
export const loginController = async (req: Request, res: Response) => {
  // throw new Error('test error') // test error
  //vào req.user để lấy thông tin user đó ra
  //dùng cái user_id để tạo token và refresh token
  const user = req.user as User //lấy user từ req.user
  const user_id = user._id as ObjectId //lấy id từ user
  const result = await usersService.login(user_id.toString()) //gọi hàm login từ service để tạo token và refresh token
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
