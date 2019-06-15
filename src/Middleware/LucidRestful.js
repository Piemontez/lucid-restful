'use strict'
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

const inflection = require('inflection');

class LucidRestfullException extends Error {
  constructor(name, message) {
    super()
    this.name = name
    this.message = message
  }
}

const except = ['with', 'include', 'page', 'count', 'sort']

class LucidRestful {
  /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
  async handle (ctx, next, properties) {

    this.props = {
      modelfolder: 'App/Models/'
    };

    /* parse properties */
    (properties||[]).forEach(prop => {
      const [ l, r ] = prop.split('=');
      this.props[l] = r||l;
    })

    const { request, params } = ctx;
    const method = request.method();

    this.parseParameters(request, params)
    this.getColection(request, params)

    //console.log(request.collectionName, method.toLocaleLowerCase(), request.idMatch, request.lucidMethod)

    if (request.lucidMethod) {
      switch(request.lucidMethod) {
        case 'count':
          await this.count(request, params)
        break;
        default:
          throw new LucidRestfullException('METHOD_NOT_ALLOWED', 'Method Not Allowed')
      }
    }
    else if (request.idMatch) {
      switch(method.toLocaleLowerCase()) {
        case 'get':
          await this.retriveByPk(request, params)
          break;
        case 'put':
          await this.update(request, params)
          break;
        case 'delete':
          await this.delete(request, params)
          break;
        default:
          throw new LucidRestfullException('METHOD_NOT_ALLOWED', 'Method Not Allowed')
      }
    } else {
      switch(method.toLocaleLowerCase()) {
        case 'get':
          await this.findAll(request, params)
          break;
        case 'post':
          await this.new(request, params)
          break;
        //case 'delete':
        //  this.bulkDelete();
        //case 'put':
        //  this.bulkUpdate();
        default:
          throw new LucidRestfullException('METHOD_NOT_ALLOWED', 'Method Not Allowed')
      }
    }

    next()
  }

  parseParameters(request, params) {
    const { collection, id } = params
    const reserved = ['count']

    request.collectionName = inflection.camelize(collection)

    if (Array.isArray(id)) {
      if (reserved.includes(id[0]))
        request.lucidMethod = id[0]
      else
        request.idMatch = id[0]
    } else {
      request.idMatch = id
    }
  }

  getColection(request/*, params*/) {
    request.collectionModel = use(`${this.props.modelfolder}${request.collectionName}`)
  }


  async findAll(request, params) {
    let query = request.collectionModel.query()

    this.buildQuery(query, request, params)

    request.queryResult = await query.fetch()
  }

  async retriveByPk(request, params) {
    let query = request.collectionModel;

    request.queryResult = await query.findOrFail(request.idMatch)
  }

  async new(request/*, params*/) {
    const model = new request.collectionModel;

    if (request.collectionModel.fillable)
      model.fill(request.only(request.collectionModel.fillable))
    else
      model.fill(request.body)
    await model.save()

    request.queryResult = model.toJSON()

  }

  async delete(request/*, params*/) {
    const model = await request.collectionModel.findOrFail(request.idMatch)

    request.queryResult = model

    await model.delete()
  }

  async update(request/*, params*/) {
    const model = await request.collectionModel.findOrFail(request.idMatch)

    if (request.collectionModel.fillable)
      model.merge(request.only(request.collectionModel.fillable))
    else
      model.merge(request.body)
    await model.save()

    request.queryResult = model
  }

  async count(request, params) {
    let query = request.collectionModel.query()

    this.buildQuery(query, request, params)

    request.queryResult = await query.count().first()
  }

  buildQuery(query, request/*, params*/) {

    this.buildWith(query, request);
    this.buildInclude(query, request); //Todo: remove após migração
    this.buildFilters(query, request);
  }

  buildFilters(query, request) {
    let params = request.except(except);
    for (var key in params) {
      const where =  paramsToQuery(key, params[key])

      if (where.key === 'q') {

      } else
        switch(where.method) {
          case 'where':
            query.where(where.key, where.op, where.value)
            break;
          case 'whereIn':
            query.whereIn(where.key, where.value)
            break;
          case 'whereNotIn':
            query.whereNotIn(where.key, where.value)
            break;
          case 'whereNotNull':
            query.whereNotNull(where.key)
            break;
          case 'whereNull':
            query.whereNull(where.key)
            break;
          default:
        }
    }
  }


  buildWith(query, request) {
    let only = request.only('with');
    if (only.with)
      only.with.split(',').forEach(w => {
        query.with(w)
      })
  }

  buildInclude(query, request) {
    let only = request.only('include');
    if (only.include)
      only.include.split(',').forEach(i => {
        let [Model, w] = i.split(':')

        query.with(w)
      })
  }
}

function paramsToQuery(key, value) {
  const join = (value == '') ? key : key.concat('=', value)
  const parts = join.match(/^(!?[^><!=:]+)(?:=?([><]=?|!?=|:.+=)(.+))?$/)
  let op, method = 'where', hash = {}
  if (!parts) return null

  key = parts[1]
  op = parts[2]

  if (!op) {
    if (key[0] != '!') method = 'whereNotNull'
    else {
        key = key.substr(1)
        method = 'whereNull'
    }
  } else if (op == '=' && parts[3] == '!') {
      method = 'whereNull'
  } else if (op == '=' || op == '!=') {
      if ( op == '=' && parts[3][0] == '!' ) op = '<>'
      var array = typedValues(parts[3]);
      if (array.length > 1) {
          value = {}
          method = (op == '=') ? 'whereIn' : 'whereNotIn'
          value = array
      } else if (op == '!=') {
        op = '<>'
      } else if (array[0][0] == '!') {
        op = '<>'
        value = array[0].substr(1)
      } else {
        value = array[0]
      }
  } else if (op[0] == ':' && op[op.length - 1] == '=') {
      op = op.substr(1, op.length - 2)
      var array = []
      parts[3].split(',').forEach(function(value) {
          array.push(typedValue(value))
      })
      value = array.length == 1 ? array[0] : array
  } else {
      value = typedValue(parts[3])
  }

  return {
    key: key,
    method: method,
    op: op,
    value: value
  }
}

function typedValues(svalue) {
  var commaSplit = /("[^"]*")|('[^']*')|([^,]+)/g
  var values = []
  svalue
      .match(commaSplit)
      .forEach(function(value) {
          values.push(typedValue(value))
      })
  return values;
}

function typedValue(value) {
  if (value[0] == '!') value = value.substr(1)
  var regex = value.match(/^\/(.*)\/(i?)$/);
  var quotedString = value.match(/(["'])(?:\\\1|.)*?\1/);

  if (regex) {
    return new RegExp(regex[1], regex[2]);
  } else if (quotedString) {
    return quotedString[0].substr(1, quotedString[0].length - 2);
  } else if (value === 'true') {
    return true;
  } else if (value === 'false') {
    return false;
  } else if (iso8601.test(value) && value.length !== 4) {
    return new Date(value);
  } else if (!isNaN(Number(value))) {
    return Number(value);
  }

  return value;
}

let iso8601 = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?)?(T([01][0-9]|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/

module.exports = LucidRestful

