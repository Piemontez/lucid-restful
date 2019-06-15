# lucid-restful
> Adonis Provider/Middleware package to create **RESTful API for Lucid ORM**.

## Setup:

1. Install required packages
```bash
adonis install lucid-restful --yarn
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

## API

### Querying documents
The query API (GET /:collection) uses a robust query syntax that interprets comparision operators (=, !=, >, <, >=, <=) in the query portion of the URL using.

### Get example
For example, the URL `https://localhost/restapi/users?name=John&age>=21` would search the User collection for any entries that have a **name of "John"** and an **age greater than or equal to 21**.

```js
[
  { id: '1', name: 'John', age: 21 }
]
```

### Pager e Sort
URL `https://localhost/restapi/users?sort=name&page=1&limit=10`


### Post example
Documents are saved using the Lucid ORM save function.
An example post return the document saved:

URL: `https://localhost/restapi/users/1`
Data: `{ name: 'Peter', age: 19 }`
Result:
```js
{
  id: 2,
  name: 'Peter',
  age: 19
}

```

### Count example

URL: `https://localhost/restapi/count?age>=18`
Result
```js
{ count: 2 }
```

## With suporte / Eager Loading

To get a relation to another model using "with", just use the "with" parameter as an examples:

URL: `https://localhost/restapi/comment?with=post`
Result
```js
[{ 
	id: 1,
	body: 'lorem ipsum',
	post_id: 1,
	post: {
		id: 1,
		title: 'Lipsum',
		body: 'It's awesome'
	} 
}]
```

URL: `https://localhost/restapi/post?with=comments`
Result
```js
[{
	id: 1,
	title: 'Lipsum',
	body: 'It's awesome',
	comments: [{
		id: 1,
		body: 'lorem ipsum',
		post_id: 1,
	}]
}]
```

## Configuration

### Fillable Properties

The fillable property specifies which attributes should be mass-assignable. 
This can be set at the model class.

```js
class Post extends Model {
  ...
}
Post.fillable = ['title', 'body']

```

### Midleware properties

| Route         | Type   | Default    | Notes                |
| ------------- | ------ | ---------- | -------------------- |
| modelfolder   | String | App/Models | Change Models Folder |


### Custom controller

if you need to customize the data output.

```js
Route.resource('/restapi/:collection/:id*', '_Custom_Controller_').middleware(['lucid-restful'])
```

## Complete example

start/routes.js
```js
Route.restful('/restapi/config', 'modelfolder=App/Models/Config/')
Route.restful('/restapi')
```

App/Models/Post.js
```js
class Post extends Model {
  ...
  comments () {
    return this.hasMany('App/Models/Comment')
  }
}
Post.fillable = ['title', 'body']

```

App/Models/Comment.js
```js
class Comment extends Model {
  ...
  post () {
    ...
    return this.belongsTo('App/Models/Post')
  }
}
Post.fillable = ['post_id', 'body']

```

App/Models/Config/Notification.js
```js
class Notification extends Model {
    ...
}
Notification.fillable = ['user_id', 'type', 'active']
```

## Todo

| Item               | Status           | Version   |
| ------------------ | ---------------- | --------- |
| Fillable values    | Finished         | 0.1.2     |
| Populate / With    | Finished         | 0.1.4     |
| Change to Provider | Finished         | 0.1.5     |
| Build Filters      | Finished         | 0.1.6     |
| Sort               | In Developed     | 0.1.[7-9] |
| Pager              | In Developed     | 0.1.[7-9] |
| Cascade Save       | In Developed     | 0.1.[7-9] |
| Adonis Validator   | Waiting          | 0.2       |

