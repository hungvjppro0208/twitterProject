import { NextFunction, Request, Response } from 'express'
import { checkSchema } from 'express-validator'
import { JsonWebTokenError } from 'jsonwebtoken'
import { capitalize, omit } from 'lodash'
import { ObjectId } from 'mongodb'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/message'
import { ErrorWithStatus } from '~/models/Errors'
import databaseService from '~/services/database.severvices'
import { verifyToken } from '~/utils/jwt'
import { validate } from '~/utils/validation'

export const defaultErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // res.status(err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json(omit(err, ['status']))
  if (err instanceof ErrorWithStatus) {
    return res.status(err.status).json(omit(err, ['status']))
  }
  //còn nếu code mà chạy xuống được đây thì error sẽ là 1 lỗi mặc định
  //err(message, name, stack)
  Object.getOwnPropertyNames(err).forEach((key) => {
    Object.defineProperty(err, key, { enumerable: true })
  })
  //ném lỗi đó cho người dùng
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    message: err.message,
    errorInfo: omit(err, ['stack'])
  })
}
export const forgotPasswordValidator = validate(
  checkSchema({
    email: {
      isEmail: {
        errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
      },
      trim: true,
      custom: {
        options: async (value, { req }) => {
          //tìm trong database xem có user nào sở hữu email = value của email người dùng gữi lên không
          const user = await databaseService.users.findOne({
            email: value
          })
          //nếu không tìm đc user thì nói user không tồn tại
          //khỏi tiến vào controller nữa
          if (user === null) {
            throw new Error(USERS_MESSAGES.USER_NOT_FOUND) //422
          }
          //đến đâu thì oke
          req.user = user // lưu user mới tìm đc lại luôn, khi nào cần thì xài
          return true
        }
      }
    }
  })
)
export const verifyForgotPasswordTokenValidator = validate(
  checkSchema(
    {
      forgot_password_token: {
        trim: true,
        custom: {
          options: async (value, { req }) => {
            //nếu k truyền lên forgot_password_token thì ta sẽ throw error
            if (!value) {
              throw new ErrorWithStatus({
                message: USERS_MESSAGES.FORGOT_PASSWORD_TOKEN_IS_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED //401
              })
            }
            //vào messages.ts thêm  FORGOT_PASSWORD_TOKEN_IS_REQUIRED: 'Forgot password token is required'
            //nếu có thì decode nó để lấy đc thông tin của người dùng
            try {
              const decoded_forgot_password_token = await verifyToken({
                token: value,
                secretOrPublickey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string
              })
              //lưu decoded_forgot_password_token vào req để khi nào muốn biết ai gữi req thì dùng
              ;(req as Request).decoded_forgot_password_token = decoded_forgot_password_token
              //vào type.d.ts thêm decoded_forgot_password_token?: TokenPayload cho Request
              //dùng user_id trong decoded_forgot_password_token để tìm user trong database
              //sẽ nhanh hơn là dùng forgot_password_token(value) để tìm user trong database
              const { user_id } = decoded_forgot_password_token
              const user = await databaseService.users.findOne({
                _id: new ObjectId(user_id)
              })
              //nếu k tìm đc user thì throw error
              if (user === null) {
                throw new ErrorWithStatus({
                  message: USERS_MESSAGES.USER_NOT_FOUND,
                  status: HTTP_STATUS.UNAUTHORIZED //401
                })
              }
              //nếu forgot_password_token đã được sử dụng rồi thì throw error
              //forgot_password_token truyền lên khác với forgot_password_token trong database
              //nghĩa là người dùng đã sử dụng forgot_password_token này rồi
              if (user.forgot_password_token !== value) {
                throw new ErrorWithStatus({
                  message: USERS_MESSAGES.INVALID_FORGOT_PASSWORD_TOKEN,
                  status: HTTP_STATUS.UNAUTHORIZED //401
                })
              }
              //trong messages.ts thêm   INVALID_FORGOT_PASSWORD_TOKEN: 'Invalid forgot password token'
            } catch (error) {
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  message: capitalize((error as JsonWebTokenError).message),
                  status: HTTP_STATUS.UNAUTHORIZED //401
                })
              }
              throw error
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)
