require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const app = express()
const cors = require('cors')
const Person = require('./models/person')

app.use(cors())
app.use(express.json())
app.use(express.static('dist'))

morgan.token('body', (request) => {
  return request.method === 'POST' ? JSON.stringify(request.body) : ''
})

app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'))

app.get('/', (request, response) => {
  response.send('<h1>Hello World!</h1>')
})

app.get('/api/persons', (request, response) => {
  Person.find({}).then( contacts => {
    response.json(contacts)
  })
})

app.get('/info', (request, response) => {
    const now = new Date()
    Person.find({}).then( contacts => {
      response.send(`<p> PhoneBook has info for ${contacts.length} people </p> <p> ${now} </p>`)
  })
})

app.get('/api/persons/:id', (request, response, next) => {

  Person.findById(request.params.id).then(contact => {
    if (contact) {
      response.json(contact)
    } else {
      response.status(404).end()
    }
  })
  .catch( error => next(error))
})

app.post('/api/persons', (request, response, next) => {
  const body = request.body
  console.log(body)
  if (!body.name || !body.number) {
    const error = { name: 'MissingInfo' }
    next(error)
  } else {
      const newContact = new Person ({
      name: body.name,
      number: body.number,
      })

      newContact.save().then(savedContact => {
        response.json(savedContact)
      })
      .catch (error => next(error))
  }
})


app.put('/api/persons/:id', (request, response, next) => {
  const { name, number } = request.body

  Person.findByIdAndUpdate(request.params.id, { name, number },
    { new: true, runValidators: true, context: 'query' })
    .then(updatedContact => {
      response.json(updatedContact)
    })
    .catch(error => next(error))
})

app.delete('/api/persons/:id', (request, response, next) => {
  Person.findByIdAndDelete(request.params.id)
  .then(result => {
    response.status(204).end()
  })
  .catch (error => next(error))
})

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

app.use(unknownEndpoint)

const errorHandler = (error, request, response, next) => {
  console.error(error.message)
  console.log(error.name)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'Malformatted id' })
  }
  if (error.name === 'MissingInfo') {
    return response.status(400).send({ error: 'Name or number missing' })
  }
  if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  }

  next(error)
}

app.use(errorHandler)

const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})