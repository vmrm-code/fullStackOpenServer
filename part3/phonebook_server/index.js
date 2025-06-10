const express = require('express')
const morgan = require('morgan')
const app = express()
const cors = require('cors')

app.use(cors())
app.use(express.json())

morgan.token('body', (request) => {
  return request.method === 'POST' ? JSON.stringify(request.body) : ''
})

app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'))

let contacts = [
    { 
      "id": 1,
      "name": "Arto Hellas", 
      "number": "040-123456"
    },
    { 
      "id": 2,
      "name": "Ada Lovelace", 
      "number": "39-44-5323523"
    },
    { 
      "id": 3,
      "name": "Dan Abramov", 
      "number": "12-43-234345"
    },
    { 
      "id": 4,
      "name": "Mary Poppendieck", 
      "number": "39-23-6423122"
    }
]

app.get('/api/persons', (request, response) => {
  response.json(contacts)
})

app.get('/info', (request, response) => {
    const now = new Date()
  response.send(`<p> PhoneBook has info for ${contacts.length} people </p>
                <p> ${now} </p>`)
})

app.get('/api/persons/:id', (request, response) => {
  const id = Number(request.params.id)
  const contact = contacts.find(contact => contact.id === id)
  if (contact) {
    response.json(contact)
  } else {
    response.statusMessage = "Current contact does not exists";
    response.status(404).end()
  }
})

app.delete('/api/persons/:id', (request, response) => {
  const id = Number(request.params.id)
  contacts = contacts.filter(contact => contact.id !== id)

  response.status(204).end()
})

app.post('/api/persons', (request, response) => {
  const body = request.body

  if (!body.name || !body.number) {
    return response.status(400).json({ 
      error: 'Name or number missing' 
    })
  }

  if (contacts.find(contact => contact.name.toLowerCase() === body.name.toLowerCase())) {
     return response.status(409).json({ 
      error: 'The name already exists in the phoneBook' 
    })
  }

  const id = Math.floor(Math.random() * 1000000)
  const newContact = {
    name: body.name,
    number: body.number || '',
    id: id,
  }

  contacts = contacts.concat(newContact)

  response.json(newContact)
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})