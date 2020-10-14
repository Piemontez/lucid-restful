'use strict'

const inflection = require('inflection');
const ModelHooks = use('Lucid/ModelHooked')

class LucidPresetsException extends Error {
  constructor(name, message) {
    super()
    this.name = name
    this.message = message
  }
}

class LucidPresets {
  async handle (ctx, next, properties) {

    this.props = { };

    /* parse properties */
    (properties||[]).forEach(prop => {
      const [ l, r ] = prop.split('=');
      this.props[l] = r||l;
    })

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

    if (!request.collectionModel)
      throw new LucidPresetsException('COLLECTION_NOT_FOUND', `Collection "${request.collectionName}" not found`)
  }

  getValidator(request/*, params*/) {
    const valname = 'Validators' + request.collectionName;

    if (!ModelHooks.hasOwnProperty(valname))
      try {
        ModelHooks[valname] = new (use(`App/Validators/${request.collectionName}`))
      } catch(err) {
        if (err.code !== 'MODULE_NOT_FOUND')
          throw err
        ModelHooks[valname] = null
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

      for (const fill of (model.cascadeFillable||[])) {
        modelInstance.$hidden.$rest[fill] = modelInstance.$attributes[fill]
        modelInstance[fill] = undefined
        delete modelInstance.$attributes[fill];
      }
    })

    /* save cascade attributes */
    model.addHook('afterSave', async (modelInstance) => {
      for (const fill of (model.cascadeFillable||[])) {
        const trx = modelInstance.$hidden.trx||null;
        const attributes = modelInstance.$hidden.$rest[fill];

        if (!attributes && !Array.isArray(attributes)) continue;

        const relationship = modelInstance[fill]();
        const relatedModel = CascadeFill.getModel(relationship.RelatedModel);

        if (relationship.constructor.name === "BelongsToMany")
          await this.fillBelongsToMany(relationship, attributes, relatedModel, modelInstance[model.primaryKey], trx);

        if (relationship.constructor.name === "HasMany")
          await this.fillHasMany(relationship, attributes, relatedModel, modelInstance[model.primaryKey], trx);
      }
      delete modelInstance.$hidden.$rest
    })
  }

  async fillBelongsToMany(relationship, attributes, model, parentId, trx) {
    await relationship.sync(attributes.map(x => x.id||x), null, trx)
  }

  async fillHasMany(relationship, attributes, model, parentId, trx) {
    for (let attr of attributes) {
      const hasComposite = Array.isArray(model.compositeKey) && model.compositeKey.length > 0
      const key = attr[model.primaryKey]

      if (model.fillable) {
        let _att = {}

        if (hasComposite)
          for (const key of model.compositeKey) {
            _att[key] = attr[key]
          }

        model.fillable.forEach(fill => {
          if (attr[fill] !== undefined)
            _att[fill] = attr[fill]
        })
        attr = _att
      }
      if (hasComposite) {
        const findQuery = model.query(trx)
        const updateQuery = model.query(trx)

        for (const key of model.compositeKey) {
          if (attr[key] === undefined || attr[key] === null) {
            if (key === relationship.foreignKey && parentId)
              attr[key] = parentId;
            else
              throw new LucidPresetsException('EMPTY_COMPOSITE_KEY', `Collection "${request.collectionName}" keys required`)
          }

          findQuery.where(key, attr[key])
          updateQuery.where(key, attr[key])
        }

        const related = await findQuery.first()

        if (related)
          await updateQuery.update(attr)
        else
          await relationship.create(attr, trx)
      } else {
        if (!key) {
          await relationship.create(attr, trx)
        } else {
          let related = await model.findOrFail(key)
          related.merge(attr)
          await relationship.save(related, trx)
        }
      }
    }
  }
}

module.exports = LucidPresets
