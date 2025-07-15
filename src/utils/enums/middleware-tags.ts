enum AuthMiddlewareTag {
  VerifyOauthCode = 'verify-oauth-code',
  VerifyRefreshToken = 'verify-refresh-token',
  VerifyAccessToken = 'verify-access-token'
}

enum FormMiddlewareTag {
  VerifyRequestFormOtp = 'verify-request-form-otp',
  VerifyRequestForm = 'verify-request-form'
}

enum ModelMiddlewareTag {
  Main = 'main-model',
  Memory = 'in-memory-model'
}

enum RabbitMQMiddlewareTag {
  InitRpcChan = 'init-rpc-chan',
  InitTopicChan = 'init-topic-chan'
}

enum UserMiddlewareTag {
  VerifyAuthor = 'verify-author'
}
