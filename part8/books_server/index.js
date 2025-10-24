const { ApolloServer } = require('@apollo/server')
const { expressMiddleware } = require('@as-integrations/express4')
const express = require('express')
const http = require('http')
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const { PubSub } = require('graphql-subscriptions')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const { WebSocketServer } = require('ws')
const { useServer } = require('graphql-ws/lib/use/ws')
const dotenv = require('dotenv')
const { GraphQLError } = require('graphql');

require('dotenv').config()

const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')


const pubsub = new PubSub()

mongoose.set('strictQuery', false)

const MONGODB_URI = process.env.MONGODB_URI
const JWT_SECRET = process.env.JWT_SECRET

console.log('connecting to', MONGODB_URI)

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connection to MongoDB:', error.message)
  })

const typeDefs = `

  type Book {
    title: String!,
    published: Int!,
    author: Author!,
    id: ID!,
    genres: [String!]!
  }

  type Author {
    name: String!,
    id: ID!,
    born: Int,
    bookCount: Int!
  }

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allAuthors: [Author!]!
    allBooks(author: String, genre: String): [Book!]!
    me: User
  }

  type Mutation {
    addBook(
      title: String!,
      author: String!,
      published: Int!,
      genres: [String!]!
    ): Book

    editAuthor(name: String!, setBornTo: Int!): Author

    createUser(
      username: String!
      favoriteGenre: String!
    ): User

    login(
      username: String!
      password: String!
    ): Token
  }

  type Subscription {
    bookAdded: Book!
  }
`

const resolvers = {
  Query: {
    bookCount: async () => await Book.countDocuments(),
    authorCount: async () => await Author.countDocuments(),
    allAuthors: async () => {

      const authors = await Author.find({})
      const books = await Book.find({})
      return authors.map(author => {
        const bookCount = books.filter(book => book.author.toString() === author._id.toString()).length
        return {
        name: author.name,
        id: author._id,
        born: author.born,
        bookCount
      }})
    },
    allBooks: async (root, args) => {

      const filters = {}
      if(args.author){
        const author = await Author.findOne({ name: args.author })
        if(author){
          filters.author = author.id
        }
        else {
          return []
        }
      }

      if(args.genre) {
        filters.genres = { $in: [args.genre] }
      }
      
      /*let filteredBooks = books

      if (args.author) {
        filteredBooks = filteredBooks.filter(book => book.author === args.author)
      }
      if (args.genre) {
        filteredBooks = filteredBooks.filter(book => book.genres.includes(args.genre))
      }*/
      
      return Book.find(filters).populate('author')
    },
    me: (root, args, context) => {
      return context.currentUser
    },
  },
  Mutation: {
    addBook: async (root, args, context) => {
      
      try {
        const currentUser = context.currentUser

        if (!currentUser) {
          throw new GraphQLError('Not authenticated', {
            extensions: { code: 'UNAUTHENTICATED' }
          })
        }

        let author = await Author.findOne({ name: args.author })

        if (!author) {
          author = new Author({
            name: args.author,
            born: null
          })
          await author.save()
        }

        const book = new Book({ 
          title: args.title,
          published: args.published,
          genres: args.genres,
          author: author._id
        })

        console.log(book)

        await book.save()

        const populatedBook = await book.populate('author')
        pubsub.publish('BOOK_ADDED', { bookAdded: populatedBook })

        return populatedBook
      }
      catch(error) {
        throw new GraphQLError('Error creating book', {
          extensions: {
            code: 'BAD_USER_INPUT',
            invalidArgs: args,
            error
          }
        })
    }
    },
    editAuthor: async (root, args, context) => {

      try {

        const currentUser = context.currentUser
        if (!currentUser) {
          throw new GraphQLError('Not authenticated', {
            extensions: { code: 'UNAUTHENTICATED' }
          })
        }

        const author = await Author.findOne({name: args.name})
        if(!author){
          throw new GraphQLError('Author not found', {
            extensions: { code: 'BAD_USER_INPUT', invalidArgs: args.name }
          })
        }
        const updatedAuthor = await Author.findByIdAndUpdate(
          author._id,
          { born: args.setBornTo },
          { new: true }
        )

        return updatedAuthor
      }
      catch(error) {
        throw new GraphQLError('Error editing author', {
          extensions: {
          code: 'BAD_USER_INPUT',
          invalidArgs: args,
          error
          }
        })
      }
    },

    createUser: async (root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre
      })

      try {
        return await user.save()
      } catch (error) {
        throw new GraphQLError('Creating user failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            invalidArgs: args,
            error
          }
        })
      }
    },

    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })

      const passwordCorrect = args.password === 'secret'

      if (!user || !passwordCorrect) {
        throw new GraphQLError('wrong credentials', {
          extensions: {
            code: 'BAD_USER_INPUT'
          }
        })
      }

      const userForToken = {
        username: user.username,
        id: user._id
      }

      return {
        value: jwt.sign(userForToken, JWT_SECRET)
      }
    }
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator(['BOOK_ADDED'])
    },
  },
}

const app = express()
const httpServer = http.createServer(app)

const schema = makeExecutableSchema({ typeDefs, resolvers })

// WebSocket server
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

const serverCleanup = useServer({ schema }, wsServer)

const server = new ApolloServer({
  schema,
})

const start = async () => {
  await server.start()

app.use(cors());
app.use(express.json());

app.use(
  '/',
  expressMiddleware(server, {
    context: async ({ req }) => {
      const auth = req?.headers.authorization;
      if (auth && auth.toLowerCase().startsWith('bearer ')) {
        const token = auth.substring(7);
        try {
          const decodedToken = jwt.verify(token, JWT_SECRET);
          const currentUser = await User.findById(decodedToken.id);
          return { currentUser };
        } catch (e) {
          console.error('Invalid token');
        }
      }
      return {};
    },
  })
);

  const PORT = 4000
  httpServer.listen(PORT, () =>
    console.log(`Server ready at http://localhost:${PORT}`)
  )
}

start()
