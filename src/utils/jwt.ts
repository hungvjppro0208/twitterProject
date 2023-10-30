import jwt from 'jsonwebtoken'
import { config } from 'dotenv'
import { TokenPayload } from '~/models/requests/User.reques'
config()
//privateKey là password để được quyền tạo chữ ký jwt
export const signToken = ({
  payload,
  privateKey,
  options = { algorithm: 'HS256' }
}: {
  payload: string | object | Buffer
  privateKey: string
  options?: jwt.SignOptions
}) => {
  return new Promise<string>((resolve, reject) => {
    jwt.sign(payload, privateKey, options, (error, token) => {
      if (error) throw reject(error)
      resolve(token as string)
    })
  })
}

//hàm kiểm tra token có phải của mình tạo ra hay không ? nếu có thì trả ra payload
export const verifyToken = ({ token, secretOrPublickey }: { token: string; secretOrPublickey: string }) => {
  return new Promise<TokenPayload>((resolve, reject) => {
    //TokenPayload
    jwt.verify(token, secretOrPublickey, (error, decoded) => {
      if (error) throw reject(error)
      resolve(decoded as TokenPayload) //đổi thành TokenPayload
    })
  })
}
