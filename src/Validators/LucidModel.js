'use strict'

const { formatters } = use('Validator')

class LucidModelValidator {
  get rules () {
    let val = this.ctx.request.collectionValidator||{};
    val.ctx = this.ctx;
    return val.rules;
  }
  get messages () {
    let val = this.ctx.request.collectionValidator||{};
    val.ctx = this.ctx;
    return val.messages;
  }

  /*get data () {
    const requestBody = this.ctx.request.all()

    return requestBody
  }*/

  /*get validateAll () {
    return true
  }*/

  async fails (errorMessages) {
    errorMessages.errors.forEach(error => {
      error.message = error.detail
      error.field = (error.source||{}).pointer
    })
    return this.ctx.response.status(401).json(errorMessages)
  }

  get formatter () {
    return formatters.JsonApi
  }
}

module.exports = LucidModelValidator
