const { ServiceProvider } = require.main.require('@adonisjs/fold')

class LucidRestfulProvider extends ServiceProvider {
    register () {
        this.app.bind('Lucid/Controllers/RestfulController', app => {
            const RestfulController = require('../src/Controllers/RestfulController')
            return RestfulController
          })

        this.app.bind('Lucid/Middleware/Resource', () => {
            const Middleware = require('../src/Middleware/LucidRestful')
            return new Middleware()
          })
    }

    boot () {
        // optionally do some initial setup
    }
}

module.exports = LucidRestfulProvider