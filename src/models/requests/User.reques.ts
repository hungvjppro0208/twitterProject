import { JwtPayload } from 'jsonwebtoken'
import { TokenType } from '~/constants/enums'

//định nghĩa những request body | params | query
export interface RegisterReqBody {
  name: string
  email: string
  password: string
  confirm_password: string
  date_of_birth: string
}

//định nghĩa req cho thằng logoutController
export interface LogoutReqBody {
  refresh_token: string
}
export interface TokenPayload extends JwtPayload {
  user_id: string
  token_type: TokenType
}
export interface emailVerifyReqBody {
  emailVerifyReqBody: string
}
