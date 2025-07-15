export enum TwoFAMethod {
  Passkey = 'passkey',
  App = 'app'
}

export enum EmailSubject {
  AddPassword = 'add-password',
  ResetPassword = 'reset-password',
  UpdateEmail = 'update-email',
  UpdateUsername = 'update-username'
}

export enum CommonStatus {
  Success = 'success',
  Rejected = 'rejected',
  Expired = 'expired',
  Pending = 'pending'
}

export enum OauthProvider {
  Apple = 'Apple',
  Google = 'Google',
  Github = 'Github',
  Microsoft = 'Microsoft'
}

export enum ExchangeName {
  Direct = 'DirectExchange',
  Rpc = 'RpcExchange',
  Topic = 'TopicExchange',
  Fanout = 'FanoutExchange'
}

export enum ExchangeType {
  Direct = 'direct',
  Topic = 'topic',
  Fanout = 'fanout'
}
