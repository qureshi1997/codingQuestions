const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const format = require('date-fns/format')
const isValid = require('date-fns/isValid')
const parseISO = require('date-fns/parseISO')

const dbPath = path.join(__dirname, './todoApplication.db')
const app = express()
app.use(express.json())
let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server running at http://localhost:3000')
    })
  } catch (e) {
    console.log(`DB Error----- ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const priorityArray = ['HIGH', 'MEDIUM', 'LOW']
const statusArray = ['TO DO', 'IN PROGRESS', 'DONE']
const categoryArray = ['WORK', 'HOME', 'LEARNING']

function checkValidity(request, response, next) {
  const {priority, status, category} = request

  if (
    priorityArray.includes(priority) &&
    statusArray.includes(status) &&
    categoryArray.includes(category)
  ) {
    next()
  } else {
    if (!priorityArray.includes(priority)) {
      response.status(400)
      response.send('Invalid Todo Priority')
    }
    if (!statusArray.includes(status)) {
      response.status(400)
      response.send('Invalid Todo Status')
    }
    if (!categoryArray.includes(category)) {
      response.status(400)
      response.send('Invalid Todo Category')
    }
  }
}

const authenticateFn = (request, response, next) => {
  const queryParameters = request.query
  // console.log(queryParameters)
  const {
    priority = 'MEDIUM',
    status = 'DONE',
    category = 'WORK',
  } = queryParameters

  request.priority = priority
  request.status = status
  request.category = category
  next()
}

const checkValidFn = (request, response, next) => {
  const {
    priority = 'MEDIUM',
    status = 'DONE',
    category = 'WORK',
    dueDate = '2021-01-21',
  } = request.body

  // request.priority = priority
  // request.status = status
  // request.category = category
  // next()    // call the checkValidity(request,response,next)

  if (
    priorityArray.includes(priority) &&
    statusArray.includes(status) &&
    categoryArray.includes(category)
  ) {
    next()
  } else {
    if (!priorityArray.includes(priority)) {
      response.status(400)
      response.send('Invalid Todo Priority')
    }
    if (!statusArray.includes(status)) {
      response.status(400)
      response.send('Invalid Todo Status')
    }
    if (!categoryArray.includes(category)) {
      response.status(400)
      response.send('Invalid Todo Category')
    }
  }
  if (parseISO(dueDate) == 'Invalid Date') {
    response.status(400)
    response.send('Invalid Due Date')
  }
}

// API -1:

app.get('/todos/', authenticateFn, checkValidity, async (request, response) => {
  const parameters = request.query
  const {status = '', priority = '', category = '', search_q = ''} = parameters
  // console.log(request.query)
  const searchTodoQuery = `
  SELECT 
    id,todo,priority,status,category,due_date AS dueDate
  FROM
    todo
  WHERE
    todo LIKE '%${search_q}%' AND
    category LIKE '%${category}%' AND
    priority LIKE '%${priority}%' AND
    status LIKE '%${status}%' `

  const todosList = await db.all(searchTodoQuery)
  response.send(todosList)
})

// API -2:

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const searchTodoQuery = `
  SELECT
    id, todo, priority, status, category, due_date AS dueDate
  FROM
    todo
  WHERE
    id == ${todoId} `
  const todoFound = await db.get(searchTodoQuery)
  response.send(todoFound)
})

// API -3:

app.get('/agenda/', async (request, response) => {
  const {date} = request.query
  const dateFormat = format(new Date(date), 'yyyy-MM-dd')
  console.log(dateFormat, typeof dateFormat)

  const searchTodoQuery = `
  SELECT * 
  FROM todo
  WHERE due_date LIKE '${dateFormat}'`
  const todoFound = await db.all(searchTodoQuery)
  console.log(todoFound)
  response.send(todoFound)
})

// API -4:

app.post('/todos/', checkValidFn, async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body
  const postTodoQuery = `
  INSERT INTO
    todo(id, todo, category, priority, status, due_date)
  VALUES
    (${id}, '${todo}', '${category}', '${priority}', '${status}', '${dueDate}') `
  await db.run(postTodoQuery)
  // response.send(dbResponse)
  response.send('Todo Successfully Added')
})

// API -5:

app.put('/todos/:todoId/', checkValidFn, async (request, response) => {
  const {todoId} = request.params
  const previousTodo = `
  SELECT *
  FROM todo
  WHERE id = ${todoId} `
  const preTodo = await db.get(previousTodo)

  const {
    status = preTodo.status,
    priority = preTodo.priority,
    todo = preTodo.todo,
    category = preTodo.category,
    dueDate = preTodo.due_date,
  } = request.body

  const requestBody = request.body
  let updateColumn = ''

  if (requestBody.status) {
    updateColumn = 'Status'
  }
  if (requestBody.priority) {
    updateColumn = 'Priority'
  }
  if (requestBody.todo) {
    updateColumn = 'Todo'
  }
  if (requestBody.category) {
    updateColumn = 'Category'
  }
  if (requestBody.dueDate) {
    updateColumn = 'Due Date'
  }

  const updateTodoQuery = `
  UPDATE todo
  SET 
    status = '${status}',
    priority = '${priority}',
    todo = '${todo}',
    category = '${category}',
    due_date = ${dueDate} 
  WHERE id = ${todoId}`

  await db.run(updateTodoQuery)
  response.send(`${updateColumn} Updated`)
})

// API -6:

app.delete('/todos/:todoId/', (request, response) => {
  const {todoId} = request.params
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId} `

  db.run(deleteTodoQuery)
  response.send('Todo Deleted')
})

module.exports = app
