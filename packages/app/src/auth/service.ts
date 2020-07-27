import fs from 'fs'
import path from 'path'
import { dialog } from 'electron'
import { Channel } from '@keypering/specs'
import { getDataPath} from '../utils'
import { ParamsRequiredException, AuthNotFoundException, CurrentWalletNotSetException, AuthRejected } from '../exception'
import { getWalletIndex } from '../wallet'

const dataPath = getDataPath('auth')
const getAuthFilePath = (id: string) => path.resolve(dataPath, `${id}.json`)

export const getAuthList = (id: string): (Channel.GetAuthList.AuthProfile&{token:string})[] => {
  if (!id) {
    throw new ParamsRequiredException(`Wallet id`)
  }
  const filePath = getAuthFilePath(id)
  if (!fs.existsSync(filePath)) {
    return []
  }
  const res = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  return res
}

export const addAuth = (id: string, url: string) => {
  if (!url) {
    throw new ParamsRequiredException(`Url`)
  }
  const authList = getAuthList(id)
  const auth = authList.find(a => a.url === url)

  if (auth) {
    return auth.token
  }

  const filePath = getAuthFilePath(id)
  const time = Date.now().toString()
  const token = `${id}:${time}`
  const newList = [...authList, { url, time, token }]

  fs.writeFileSync(filePath, JSON.stringify(newList))
  return token
}

export const deleteAuth = (id: string, url: string) => {
  if (!url) {
    throw new ParamsRequiredException(`Url`)
  }
  const authList = getAuthList(id)
  if (!authList.find(auth => auth.url === url)) {
    throw new AuthNotFoundException()
  }

  const newList = authList.filter(auth => auth.url !== url)
  const filePath = getAuthFilePath(id)
  fs.writeFileSync(filePath, JSON.stringify(newList))
}

export const requestAuth = async (origin: string, url: string): Promise<string> => {
  const { current } = getWalletIndex()
  if (!current) {
    throw new CurrentWalletNotSetException()
  }
  const { response } = await dialog.showMessageBox({
    type: 'question',
    title: 'Authentication Request',
    message: `Request from: ${url}\nYou are going to share following information to ${origin}`,
    detail: "☑️ Addresses",
    buttons: ['Decline', 'Approve'],
    cancelId: 0,
    defaultId: 1,
  })
  if (response === 0) {
    throw new AuthRejected()
  }
  const token = addAuth(current, origin)

  return token
}
