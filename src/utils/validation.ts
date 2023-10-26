import e from 'express'
import express from 'express'
import { body, validationResult, ValidationChain } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/src/middlewares/schema'
import HTTP_STATUS from '~/constants/httpStatus'
import { EntityError, ErrorWithStatus } from '~/models/Errors'

// can be reused by many routes

// sequential processing, stops running validations chain if the previous one fails.
export const validate = (validations: RunnableValidationChains<ValidationChain>) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    await validations.run(req)

    const errors = validationResult(req)

    if (errors.isEmpty()) {
      return next()
    }

    const errorObjects = errors.mapped()
    const entityError = new EntityError({ errors: {} }) //tạo object lỗi mặc định

    for (const key in errorObjects) {
      //đi qua từng lỗi và lấy msg
      const { msg } = errorObjects[key]
      if (msg instanceof ErrorWithStatus && msg.status !== HTTP_STATUS.UNPROCESSABLE_ENTITY) {
        return next(msg)
      }
      entityError.errors[key] = msg
    }
    //sau khi đi qua hết các lỗi thì trả về lỗi
    next(entityError)
  }
}
