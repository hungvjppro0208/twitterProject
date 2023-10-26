import User from '~/models/schemas/User.schema'
import databaseService from './database.severvices'
import { RegisterReqBody } from '~/models/requests/User.reques'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType } from '~/constants/enums'
import { ObjectId } from 'mongodb'
import RefreshToken from '~/models/schemas/RefreshToken.schema'

class UsersService {
  private signAccessToken(user_Id: string) {
    return signToken({
      payload: { user_Id, token_type: TokenType.AccessToken },
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN }
    })
  }
  private signRefreshToken(user_Id: string) {
    return signToken({
      payload: { user_Id, token_type: TokenType.RefreshToken },
      options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_IN }
    })
  }
  private signAccessAndRefreshToken(user_Id: string) {
    return Promise.all([this.signAccessToken(user_Id), this.signRefreshToken(user_Id)])
  }
  async register(payload: RegisterReqBody) {
    const result = await databaseService.users.insertOne(
      new User({
        ...payload,
        date_of_birth: new Date(payload.date_of_birth),
        password: hashPassword(payload.password)
      })
    )
    //lấy user_id từ account vừa tạo
    const user_id = result.insertedId.toString()
    //xài ở đây
    const [access_token, refresh_token] = await this.signAccessAndRefreshToken(user_id)
    //lưu refresh token vào database
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    return { access_token, refresh_token }
  }

  async checkEmailExist(email: string) {
    //vào database tìm xem có email này chưa
    const user = await databaseService.users.findOne({ email })
    return Boolean(user)
  }
  async login(user_id: string) {
    const [access_token, refresh_token] = await this.signAccessAndRefreshToken(user_id)
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        user_id: new ObjectId(user_id),
        token: refresh_token
      })
    )
    return { access_token, refresh_token }
  }
}

const usersService = new UsersService()
export default usersService
