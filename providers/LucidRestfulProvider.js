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

        const Server = this.app.use('Server')
        Server.registerNamed({
          'lucid-restful': 'Lucid/Middleware/LucidRestful',
        })
    }

    boot () {
      const Route = this.app.use('Route')
      Route.restful = (prefix, configs) => {
        //Route.group(() => {

          Route.resource(`${prefix}/:collection/:id*`, 'Lucid/Controllers/RestfulController')
            .middleware([`lucid-restful:${configs||''}`])
          //Route.resource(`${prefix}/:collection/:id*`, 'RestfulController')
          //  .middleware([`lucid-restful:${configs||''}`])

        //}).prefix(prefix)
      }
    }
}

module.exports = LucidRestfulProvider

