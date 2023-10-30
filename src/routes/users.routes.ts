import { Router } from 'express'
import { access } from 'fs'
import {
  emailVerifyController,
  loginController,
  logoutController,
  registerController
} from '~/controllers/users.controllers'
import {
  accessTokenValidator,
  emailVerifyTokenValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator
} from '~/middlewares/users.middlewares'
import { wrapAsync } from '~/utils/handlers'

const usersRouter = Router()

usersRouter.get('/login', loginValidator, loginController, wrapAsync(registerController))

usersRouter.post('/register', registerValidator, wrapAsync(registerController))

/*
des: đăng xuất
path: /users/logout
method: POST
Header: {Authorization: 'Bearer  <access_token> '}
body: {refresh_token: string}
*/
usersRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapAsync(logoutController))

/*
des: verify email
khi người dùng đăng ký, trong email của họ sẽ có 1 link
trong link này đã setup sẵn 1 request kèm email_verify_token
thì verify email là cái route cho request đó 
path: /users/verify-email?token=<email_verify_token>

*/

usersRouter.post('/verify-email', emailVerifyTokenValidator, wrapAsync(emailVerifyController))
export default usersRouter
