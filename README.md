# lucid-restful
> Adonis Middleware package to create **RESTful API for Lucid ORM**.

## Setup:

1. Install required packages
```bash
adonis install lucid-restful --yarn
```

1. Edit `/start/app.js`
```js
Route.resource('/restapi/:collection/:id*', 'RestfulController')
  .middleware(['lucidrestful'])
```

1. Edit `/start/kernel.js
```js
const namedMiddleware = {
  ...
  lucidrestful: 'App/Middleware/LucidRestful'
}
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

### Get Example
For example, the URL `https://localhost/restapi/users?name=John&age>=21` would search the User collection for any entries that have a name of "John" and an age greater than or equal to 21.

```
[
  { id: '1', name: 'John', age: 21 }
]
```


### Post Example
Documents are saved using the Lucid ORM save function.

An example post using jQuery and return the document saved:
```
$.ajax('https://localhost/restapi/users/1', {
  method: 'POST',
  contentType: 'application/json',
  data: JSON.stringify({
      name: 'Peter',
      age: 19
  }),
  success: function (user, status, xhr) { console.log(user) },
  error: function (xhr, status, err) {...}
})
\\console log
{
  id: 2,
  name: 'Peter',
  age: 19
}

```

### Count Example

From: `https://localhost/restapi/count?age>=18`
Result
```
{ count: 2 }
```

## Configuration

### Fillable Properties

The fillable property specifies which attributes should be mass-assignable. 
This can be set at the model class.

```
class Post extends Model {
  ...
}
Post.fillable = ['title', 'body']

```

### Midleware Properties

| Route         | Type   | Default    | Notes                |
| ------------- | ------ | ---------- | -------------------- |
| modelfolder   | String | App/Models | Change Models Folder |



## Complete example

start/routes.js
```
Route.group(() => {
  Route.resource('/config/:collection/:id*', 'RestfulController')
    .middleware(['lucidrestful:modelfolder=App/Models/Config/'])

  Route.resource('/:collection/:id*', 'RestfulController')
    .middleware(['lucidrestful'])

}).prefix('/restapi')
```

App/Models/Post.js
```
class Post extends Model {
  ...
  comments () {
    return this.hasMany('App/Models/Comment')
  }
}
Post.fillable = ['title', 'body']

```

App/Models/Comment.js
```
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
```
class Notification extends Model {
    ...
}
Notification.fillable = ['user_id', 'type', 'active']
```

## Todo

| Item              | Status           | Version |
| ----------------- | ---------------- | ------- |
| Fillable values   | Finished         | 0.1.2   |
| Populate / With   | In Developed     | 0.1.4   |
| Build Filters     | Waiting          | 0.1.6   |
| Adonis Validator  | Waiting          | 0.1.8   |
| Cascade Save      | Waiting          | 0.1.10  |
| Build Filters     | Waiting          | 0.1.2   |
