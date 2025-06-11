const mongoose = require('mongoose')

mongoose.set('strictQuery',false)

const url = process.env.MONGODB_URI

mongoose.connect(url)

  .then(result => {
    console.log('connected to MongoDB')
  })
  .catch(error => {
    console.log('error connecting to MongoDB:', error.message)
  })

const personSchema = new mongoose.Schema({
  name: {
    type: String,
    minLength: 3
  },
  number: {
    type: String,
    minLength: 8,
    validate: {
      validator: function (value) {
        return /^\d{2,3}-\d+$/.test(value);
      },
      message: props => `${props.value} invalid format, it must have this XX-XXXXXXX or this XXX-XXXXXXXX format`
    }
  } 
})

personSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

/*if (process.argv.length === 5) {
    //Create a new contact
    const contact = new Person({
    name: String(process.argv[3]),
    number: String(process.argv[4]),
    })

    contact.save().then(result => {
    console.log(`contact ${contact.name} with ${contact.number} saved to the phoneBook!`)
    mongoose.connection.close()
    })
}

if (process.argv.length === 3) {

    Person.find({}).then(result => {
        console.log('Phonebook:')
        result.forEach(contact => {
        console.log(contact.name + ' ' + contact.number)
    })
    mongoose.connection.close()
    })
}*/

module.exports = mongoose.model('Person', personSchema)