const { test, after, beforeEach } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const mongoose = require('mongoose')
const helper = require('./test_helper')
const app = require('../app')
const api = supertest(app)

const Blog = require('../models/blog')
const User = require('../models/user')

beforeEach(async () => {
  await Blog.deleteMany({})
  await User.deleteMany({})
  const blogObjects = helper.initialBlogs.map(blog => new Blog(blog))
  const promiseArray = blogObjects.map(blog => blog.save())
  await Promise.all(promiseArray)
})

test('blogs are returned as json', async () => {
  await api
    .get('/api/blogs')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test('all blogs are returned', async () => {
  const response = await api.get('/api/blogs')

   assert.strictEqual(response.body.length, helper.initialBlogs.length)
})


test('the blog identifier is id', async () => {
  const response = await api.get('/api/blogs')

  assert.ok(response.body[0].id !== undefined, 'id should be defined')
  assert.strictEqual(response.body[0]._id, undefined, '_id should be undefined')
})

test('a valid blog can be added ', async () => {

  const token = await helper.getTokenForUser()

  const newBlog = {
    title: 'A test blog',
    author: 'The real author',
    url: 'http://example.com/blogTest',
    likes: 21,
  }

  await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)


  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)


  const titles = blogsAtEnd.map(n => n.title)
  assert(titles.includes('A test blog'))
})

test('a blog cant be added without a token ', async () => {

  const newBlog = {
    title: 'A test blog',
    author: 'The real author',
    url: 'http://example.com/blogTest',
    likes: 21,
  }

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(401)


  const blogsAtEnd = await helper.blogsInDb()
  
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
})

test('blog without likes gets 0 as default', async () => {

  const token = await helper.getTokenForUser()

  const newBlog = {
    title: 'A test blog',
    author: 'The real author',
    url: 'http://example.com/blogTest'
  }

  await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)


  const blogsAtEnd = await helper.blogsInDb()


  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)
  const likes = blogsAtEnd.map(n => n.likes)
  console.log(likes)
  assert(likes.includes(0))

})

test('blog without title or url cant be added', async () => {

  const token = await helper.getTokenForUser()

  const newBlog = {
    author: 'The real author',
    likes: 1
  }

  await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send(newBlog)
    .expect(400)


  const blogsAtEnd = await helper.blogsInDb()


  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
})

test('succeeds with status code 204 if id is valid', async () => {

  const token = await helper.getTokenForUser()

  const newBlog = {
    title: 'Blog to be deleted',
    author: 'Author',
    url: 'http://example.com/blogDeleted',
    likes: 1
  }

  const postResponse = await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send(newBlog)

  const blogToDelete = postResponse.body

  const blogsAtStart = await helper.blogsInDb()

  await api
    .delete(`/api/blogs/${blogToDelete.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(204)

  const blogsAtEnd = await helper.blogsInDb()

  assert.strictEqual(blogsAtEnd.length, blogsAtStart.length - 1)

  const titles = blogsAtEnd.map(r => r.title)
  assert(!titles.includes(blogToDelete.title))
})

test('can update a blog', async () => {

  const updatedBlog = {
    title: 'An updated blog',
    author: 'The real author',
    url: 'http://example.com/blogTest',
    likes: 12,
  }
  const blogsAtStart = await helper.blogsInDb()
  const blogToUpdate = blogsAtStart[0]

  await api
    .put(`/api/blogs/${blogToUpdate.id}`)
    .send(updatedBlog)
    .expect(200)
    .expect('Content-Type', /application\/json/)

  const blogsAtEnd = await helper.blogsInDb()

  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)

  const likes = blogsAtEnd.map(r => r.likes)
  assert(likes.includes(updatedBlog.likes))
})


after(async () => {
  await mongoose.connection.close()
})