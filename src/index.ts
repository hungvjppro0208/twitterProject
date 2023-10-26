import express, { Request, Response, NextFunction } from 'express'
import usersRouter from './routes/users.routes'
import databaseSevervice from './services/database.severvices'
import { error, log } from 'console'
import { defaultErrorHandler } from './middlewares/error.middlewares'

const app = express()

const PORT = 3000
databaseSevervice.connect()
app.use(express.json())

//route mac dinh cura express

app.get('/', (req, res) => {
  res.send('Khang Tran')
})

app.use('/users', usersRouter)
//localhost:3000/users/tweets

//app sử dụng một error handler tổng
app.use(defaultErrorHandler)

app.listen(PORT, () => {
  console.log(`Sever mo tren port ${PORT}`)
})
