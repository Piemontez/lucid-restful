# lucid-restful
> Adonis Provider/Middleware package to create **RESTful API for Lucid ORM**.

## Setup:

1. Install required packages
```bash
yarn add lucid-restful
or
npm install lucid-restful
```

1. Edit `/start/app.js`
```js
const providers = [
  ...
  'lucid-restful/providers/LucidRestfulProvider'
]
```

1. Edit `/start/routes.js`
```js
Route.restful('/restapi')
```

## Methods:
The middleware is schema-agnostic, allowing any json document to be persisted and retrieved from database.

| Route            | Method | Notes                       |
| ---------------- | ------ | --------------------------- |
| /:collection     | GET    | Search the collection (Filters: under development) |
| /:collection     | POST   | Create a single document    |
| /:collection     | PUT    | Method Not Allowed          |
| /:collection     | DELETE | Remove all documents        |
| /:collection/:id | GET    | Retrieve a single document  |
| /:collection/:id | POST   | Method Not Allowed          |
| /:collection/:id | PUT    | Update a document           |
| /:collection/:id | DELETE | Remove a single document    |
|                  |        |                             |
| /:collection/count | GET    | Count the collection      |
|                  |        |                             |
| /:collection     | PATCH  | Method Not Allowed          |
| /:collection/:id | PATCH  | Undeveloped Method          |


| Get examples              | Notes                            |
| ------------------------- | -------------------------------- |
| /post                     | List all posts                   |
| /post/1                   | Retrieve post with id 1          |
| /post?id>10&id<100        | List posts id between 11 and 100 |
| /posts?with=comments      | List posts with comments         |
| /posts/1?with=comments    | Retrieve post 1 with comments    |
| /posts?order=-title       | List posts sorted by title desc  |
| /posts?page=2&limit=100   | List from 101 to 200             |

## API

### Querying documents
The query API (GET /:collection) uses a robust query syntax that interprets comparision operators (=, !=, >, <, >=, <=) in the query portion of the URL using.

### GET example
For example, the URL `https://localhost/restapi/users?name=John&age>=21` would search the User collection for any entries that have a **name of "John"** and an **age greater than or equal to 21**.

```js
[
  { id: '1', name: 'John', age: 21 }
]
```

### Pager and Order by

Paginate

URL `https://localhost/restapi/users?page=1&limit=10`

Ascending

URL `https://localhost/restapi/users?order=name&page=1&limit=10`

Descending

URL `https://localhost/restapi/users?order=-name`

### POST example
Documents are saved using the Lucid ORM save function.
An example post return the document saved:

URL: `https://localhost/restapi/users`
Data: `{ name: 'Peter', age: 19 }`
Result:
```js
{
  id: 2,
  name: 'Peter',
  age: 19
}

```

### PUT example
Documents are saved using the Lucid ORM save function.

URL: `https://localhost/restapi/users/2`
Data: `{ age: 17 }`
Result:
```js
{
  id: 2,
  name: 'Peter',
  age: 17
}

```

### Count example

URL: `https://localhost/restapi/users/count?age>=18`
Result
```js
{ count: 2 }
```

## Custom filters

This midlaware add **before paginete** suporte in all restful calls. 

```js
class Post extends Model {
  static boot () {
    super.boot()

    this.addHook('beforePaginate', async (query, request) => {
		let params = request.get()
		
		if (params.customfilter) {
			query.where(..., ...)
			
			delete params.customfilter
		}
    })
  }
  ...
}
```

## With suporte / Eager loading

To get a relation to another model using "with", just use the "with" parameter as an examples:

URL: `https://localhost/restapi/comment?with=post`
Result:
```js
[{ 
	id: 1,
	body: 'Lorem ipsum',
	post_id: 1,
	post: {
		id: 1,
		title: 'Lipsum',
		body: 'It`s awesome'
	} 
}]
```

URL: `https://localhost/restapi/post?with=comments`
Result:
```js
[{
	id: 1,
	title: 'Lipsum',
	body: 'It`s awesome',
	comments: [{
		id: 1,
		body: 'Lorem ipsum',
		post_id: 1,
	}]
}]
```

## Fillable Properties

The fillable property specifies which attributes should be mass-assignable. 
This can be set at the model class.

```js
class Post extends Model {
  ...
}
Post.fillable = ['title', 'body']

```

## Cascade Save

```js
class Post extends Model {
  ...
  comments () {
    return this.hasMany('App/Models/Comment')
  }
}
Post.cascadeFillable = ['comments']
```

URL: `https://localhost/restapi/post`
Data: `{ title: 'Lipsum', comments: [{ body: 'Lorem ipsum' }] }`
Result:
```js
[{
	id: 2,
	title: 'Lipsum',
	comments: [{
		id: 3,
		body: 'Lorem ipsum',
		post_id: 2,
	}]
}]
```

## Validator

To validate the requisitions, add in the `app/Validators/` folder the validators with the same name as the templates.

`app/Models/Post.js`

`app/Validators/Post.js`


## Aggregate function suporte

```js
class Post extends Model {
  ...
  commentsCount () {
    return this.belongsTo('App/Models/Comment')
      .groupBy('post_id')
      .select('post_id')
      .select(Database.raw('count(id)'))
  }  
}
```

URL: `https://localhost/restapi/post?with=commentsCount`
Result:
```js
[{
	id: 2, title: 'Lipsum',
	commentsCount: { post_id: 2, count: 1 }
},{
	id: 3, title: 'Lorem',
	commentsCount: { post_id: 3, count: 13 }
}]
```

## Configuration

### Midleware properties

| Route         | Type   | Default    | Notes                |
| ------------- | ------ | ---------- | -------------------- |
| modelfolder   | String | App/Models | Change Models Folder |

### Custom controller

if you need to customize the data output.

```js
Route.resource('/restapi/:collection/:id*', '_Custom_Controller_').middleware(['lucid-restful'])
```

## Todo

| Item                | Status           | Version   |
| ------------------- | ---------------- | --------- |
| Fillable values     | Finished         | 0.1.2     |
| Populate / With     | Finished         | 0.1.4     |
| Change to Provider  | Finished         | 0.1.5     |
| Build Filters       | Finished         | 0.1.6     |
| Sort                | Finished         | 0.1.7     |
| Pager               | Finished         | 0.1.8     |
| Custom Filters      | Finished         | 0.1.9     |
| Cascade Save        | Finished         | 0.1.15    |
| Adonis Validator    | Finished         | 0.2       |
| Transaction suporte | Waiting          | 1.0       |

