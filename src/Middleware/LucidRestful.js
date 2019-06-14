const inflection = require('inflection');

class LucidRestfullException extends Error {
  constructor(name, message) {
    super()
    this.name = name
    this.message = message
  }
}

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

  buildFilters(/*query, request*/) {

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

module.exports = LucidRestful

