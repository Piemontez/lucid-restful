const { ServiceProvider } = require.main.require('@adonisjs/fold')
//const { ServiceProvider } = require('@adonisjs/fold')

class LucidRestfulProvider extends ServiceProvider {
    register () {
        this.app.singleton('Lucid/ModelHooked', () => {
          return new Object();
        })

        this.app.bind('Lucid/Controllers/RestfulController', app => {
            const RestfulController = require('../src/Controllers/RestfulController')
            //const RestfulController = require('../app/Controllers/Http/RestfulController')
            return RestfulController
          })

        this.app.bind('Lucid/Middleware/LucidRestful', () => {
            const Middleware = require('../src/Middleware/LucidRestful')
            //const Middleware = require('../app/Middleware/LucidRestful')
            return new Middleware()
          })

        this.app.bind('Lucid/Middleware/LucidPresets', () => {
            const Middleware = require('../src/Middleware/LucidPresets')
            //const Middleware = require('../app/Middleware/LucidPresets')
            return new Middleware()
          })


        const Server = this.app.use('Server')
        Server.registerNamed({
          'lucid-presets': 'Lucid/Middleware/LucidPresets',
          'lucid-restful': 'Lucid/Middleware/LucidRestful',
        })
    }

    boot () {
      const Route = this.app.use('Route')
      Route.restful = (prefix, configs) => {
        //Route.group(() => {

          //Route.resource(`${prefix}/:collection/:id*`, 'Lucid/Controllers/RestfulController')
          //  .middleware([`lucid-restful:${configs||''}`])
          const route = Route.resource(`${prefix}/:collection/:id*`, 'RestfulController')
            .middleware(['lucid-presets'])

          if (route.validator)
            route.validator(new Map([
                [['store'], ['LucidModelValidator']],
                [['update'], ['LucidModelValidator']],
              ]))

          route.middleware([`lucid-restful:${configs||''}`])

          return route
        //}).prefix(prefix)
      }
    }
}

module.exports = LucidRestfulProvider

