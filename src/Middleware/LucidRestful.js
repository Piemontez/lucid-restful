'use strict'

const _ = require('lodash')
const Database = use('Database')

class LucidRestfullException extends Error {
  constructor(name, message) {
    super()
    this.name = name
    this.message = message
  }
}

//Todo remover: include, count, sort
const except = ['with', 'include', 'page', 'limit', 'count', 'sort', 'order']

class LucidRestful {

  async handle (ctx, next, properties) {

    this.props = { };

    /* parse properties */
    (properties||[]).forEach(prop => {
      const [ l, r ] = prop.split('=');
      this.props[l] = r||l;
    })

    const { request, params } = ctx;
    const method = request.method();

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

    await next()
  }

  async findAll(request, params) {
    let query = request.collectionModel.query()

    this.buildQuery(query, request, params)

    request.queryResult = await query.fetch()
  }

  async retriveByPk(request, params) {
    let query = request.collectionModel.query();

    this.buildQuery(query, request, params)

    query.where(request.collectionModel.primaryKey, request.idMatch)

    request.queryResult  = await query.first()
  }

  async new(request/*, params*/) {
    const model = new request.collectionModel;

    if (request.collectionModel.fillable)
      model.fill(request.only(
        request.collectionModel.fillable
          .concat(request.collectionModel.cascadeFillable)
      ))
    else
      model.fill(request.body)

    if (!model.$hidden) model.$hidden = {}

    const trx = await Database.beginTransaction()
      model.$hidden.trx = trx
      await model.save(trx)
      request.queryResult = model.toJSON()
    await trx.commit()
  }

  async delete(request/*, params*/) {
    const model = await request.collectionModel.findOrFail(request.idMatch)

    const trx = await Database.beginTransaction()
      await model.delete(trx)
      request.queryResult = model.toJSON()
    await trx.commit()
  }

  async update(request, params) {
    const model = await request.collectionModel.findOrFail(request.idMatch)
    if (request.collectionModel.fillable)
      model.merge(request.only(
        request.collectionModel.fillable
          .concat(request.collectionModel.cascadeFillable)
      ))
    else
      model.merge(request.body)

    if (!model.$hidden) model.$hidden = {}

    const trx = await Database.beginTransaction()
      model.$hidden.trx = trx
      await model.save(trx)
    await trx.commit()

    let query = request.collectionModel.query();
    this.buildQuery(query, request, params)
    query.where(request.collectionModel.primaryKey, request.idMatch)

    request.queryResult  = await query.first()
  }

  async count(request, params) {
    let query = request.collectionModel.query()

    this.buildQuery(query, request, params)

    request.queryResult = await query.count('* as count').first()
  }

  buildQuery(query, request) {
    this.buildWith(query, request);
    this.buildInclude(query, request); //Todo: remove após migração
    this.buildFilters(query, request);
    this.buildOrder(query, request);
    this.buildPager(query, request);
  }

  buildFilters(query, request) {
    query.Model.$hooks.before.exec('paginate', query, request)

    //let params = request.except(except);
    let params = _.omit(request.get(), except);


    for (let key in params) {
      const where =  paramsToQuery(key, params[key])

      if (where.key === 'q') {
        query.where((builder) => {
          if (query.Model.qSearchFields)
            query.Model.qSearchFields.forEach(q => {
              builder.orWhere(q, 'like', where.value.toLocaleLowerCase())
            })
        })
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

  buildOrder(query, request) {
    let only = request.only(['order','sort']);
    let order = only.order || only.sort;
    if (order) {
      (order).split(',').forEach(w => {
          let direction = 'asc';
          if (w[0] === '-') {
            w = w.substr(1);
            direction = 'desc';
          }
          query.orderBy(w, direction)
        })
    }
  }

  buildPager(query, request) {
    let only = request.only(['page','count', 'limit'])
    if (only.page)
      query.forPage(parseInt(only.page, 10)||1, parseInt(only.count||only.limit, 10)||20)
  }


  buildWith(query, request) {
    let only = request.only('with');
    if (only.with)
      only.with.split(',').forEach(w => {
        query.with(w)
      })
  }

  /*
  TODO remover ao Migrar tecnologia
  */
  buildInclude(query, request) {
    let only = request.only('include');
    if (only.include)
      only.include.split(',').forEach(i => {
        let [Model, w] = i.split(':')
        query.with(w.replace('->','.'))
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

