const Blog = require('../models/blog')
const User = require('../models/user')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)

const initialBlogs = [
  {
    title: 'First blog',
    author: 'Author 1',
    url: 'http://example.com/blog1',
    likes: 5,
  },
  {
    title: 'Second blog',
    author: 'Author 2',
    url: 'http://example.com/blog2',
    likes: 3,
  },
]

const nonExistingId = async () => {
  const blog = new Blog({ content: 'willremovethissoon' })
  await blog.save()
  await blog.deleteOne()

  return blog._id.toString()
}

const blogsInDb = async () => {
  const blogs = await Blog.find({})
  return blogs.map(blog => blog.toJSON())
}

const usersInDb = async () => {
  const users = await User.find({})
  return users.map(u => u.toJSON())
}

const getTokenForUser = async () => {
  const user = {
    username: 'testuser',
    name: 'Test User',
    password: 'testpassword',
  }

  await api.post('/api/users').send(user)

  const response = await api
    .post('/api/login')
    .send({ username: user.username, password: user.password })

  return response.body.token
}

module.exports = {
  initialBlogs, nonExistingId, blogsInDb, usersInDb, getTokenForUser
}