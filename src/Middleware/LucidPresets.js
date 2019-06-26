'use strict'

const inflection = require('inflection');
const ModelHooks = use('Lucid/ModelHooked')

class LucidPresets {
  async handle (ctx, next, properties) {

    const { request, params } = ctx;

    this.parseParameters(request, params)
    this.getColection(request, params)
    this.getValidator(request, params)

    await next()
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
    request.collectionModel = CascadeFill.getModel(request.collectionName, this.props)
  }

  getValidator(request/*, params*/) {
    const valname = 'Validators' + request.collectionName;

    if (!ModelHooks.hasOwnProperty(valname))
      try {
        ModelHooks[valname] = new (use(`App/Validators/${request.collectionName}`))
      } catch(err) {
        ModelHooks[valname] = null;
      }

    request.collectionValidator = ModelHooks[valname];
  }
}

class CascadeFill {
  constructor(modelClass) {
    ModelHooks[modelClass.name] = this;

    this.addHook(modelClass)
  }

  static getModel(nameOrClass, props) {
    let modelClass = null
    if (typeof nameOrClass === 'string')
      modelClass = use(`${(props||{}).modelfolder||'App/Models/'}${nameOrClass}`)
    else
      modelClass = nameOrClass

    if (nameOrClass && modelClass && !ModelHooks.hasOwnProperty(modelClass.name)) {
      new CascadeFill(modelClass)
    }
    return modelClass;
  }

  addHook(model) {
    /* remove to save cascade attributes */
    model.addHook('beforeSave', (modelInstance) => {

      if (!modelInstance.$hidden) modelInstance.$hidden = {}
      modelInstance.$hidden.$rest = {};

      (model.cascadeFillable||[]).forEach(fill => {
        modelInstance.$hidden.$rest[fill] = modelInstance.$attributes[fill]
        modelInstance[fill] = undefined
        delete modelInstance.$attributes[fill];
      })
    })

    /* save cascade attributes */
    model.addHook('afterSave', async (modelInstance) => {
      await (model.cascadeFillable||[]).forEach(async fill => {
        const attributes = modelInstance.$hidden.$rest[fill];
        if (!attributes || !attributes.length) return;

        const relationship = modelInstance[fill]();
        const model = CascadeFill.getModel(relationship.RelatedModel)

        if (relationship.constructor.name === "BelongsToMany")
          await this.fillBelongsToMany(relationship, attributes, model)

        if (relationship.constructor.name === "HasMany")
          await this.fillHasMany(relationship, attributes, model)
      })
      delete modelInstance.$hidden.$rest
    })
  }

  async fillBelongsToMany(relationship, attributes/*, model*/) {
    await relationship.sync(attributes.map(x => x.id||x))
  }

  async fillHasMany(relationship, attributes, model) {
    await attributes.forEach(async attr => {
      let key = attr[model.primaryKey]

      if (model.fillable) {
        let _att = {}
        model.fillable.forEach(fill => {
          if (attr[fill] !== undefined)
            _att[fill] = attr[fill]
        })
        attr = _att
      }

      if (!key)
        relationship.create(attr)
      else {
        let related = await model.findOrFail(key)
        related.merge(attr)
        await relationship.save(related)
      }
    })
  }
}

module.exports = LucidPresets
