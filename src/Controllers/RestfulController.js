'use strict'

class RestfulController {
  toDefaultResult(request) {
    return request.queryResult;
  }

  async index ({ request/*, auth, params*/ }) {
    return this.toDefaultResult(request) || []
  }
  async show ({ request/*, auth, params*/ }) {
    return this.toDefaultResult(request) || {}
  }
  async store ({ request/*, auth, params*/ }) {
    return this.toDefaultResult(request) || {}
  }
  async update ({ request/*, auth, params*/ }) {
    return this.toDefaultResult(request) || {}
  }
  async delete ({ request/*, auth, params*/ }) {
    return this.toDefaultResult(request) || {}
  }
  async destroy ({ request/*, auth, params*/ }) {
    return this.toDefaultResult(request) || {}
  }
}

module.exports = RestfulController

