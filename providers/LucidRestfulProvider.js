const { ServiceProvider } = require.main.require('@adonisjs/fold')

class LucidRestfulProvider extends ServiceProvider {
    register () {
        this.app.bind('Lucid/Controllers/RestfulController', app => {
            const RestfulController = require('../src/Controllers/RestfulController')
            return RestfulController
          })

        this.app.bind('Lucid/Middleware/LucidRestful', () => {
            const Middleware = require('../src/Middleware/LucidRestful')
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
		
				Route.resource(`${prefix}/:collection/:id*`, 'Lucid/Middleware/LucidRestful')
				  .middleware([`lucid-restful:${configs||''}`])
				  
			//}).prefix(prefix)
		})
    }
}

module.exports = LucidRestfulProvider
