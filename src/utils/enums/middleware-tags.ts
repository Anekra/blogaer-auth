enum AuthMiddlewareTag {
  VerifyOauthCode = 'verify-oauth-code'
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
