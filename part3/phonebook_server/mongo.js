const mongoose = require('mongoose')

if (process.argv.length<3) {
  console.log('give password as argument')
  process.exit(1)
}

const password = process.argv[2]

const url =
  `mongodb+srv://victorvmrm9761:${password}@cluster0.zswk9ls.mongodb.net/phoneBookApp?retryWrites=true&w=majority&appName=Cluster0`

mongoose.set('strictQuery',false)

mongoose.connect(url)

const personSchema = new mongoose.Schema({
  name: String,
  number: String,
})

const Person = mongoose.model('Person', personSchema)

if (process.argv.length === 5) {
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
}


