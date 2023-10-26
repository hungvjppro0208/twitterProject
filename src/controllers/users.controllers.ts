import { NextFunction, Request, Response } from 'express'
import usersService from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import { RegisterReqBody } from '~/models/requests/User.reques'
import User from '~/models/schemas/User.schema'
import { ObjectId } from 'mongodb'
import { USERS_MESSAGES } from '~/constants/message'
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
