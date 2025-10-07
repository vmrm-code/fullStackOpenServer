const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const jwt = require('jsonwebtoken')
const middleware = require('../utils/middleware');

blogsRouter.get('/', async (request, response) => {

  const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })
  response.json(blogs)
})

blogsRouter.post('/', middleware.userExtractor, async (request, response) => {
  const blog = new Blog(request.body)
  const decodedToken = jwt.verify(request.token, process.env.SECRET)
  if (!decodedToken.id || !request.token) {
    return response.status(401).json({ error: 'token invalid or missing' })
  }
  const user = request.user

  blog.user = user.id
  const savedBlog = await blog.save()
  user.blogs = user.blogs.concat(savedBlog._id)
  await user.save()

  response.status(201).json(savedBlog)

})

blogsRouter.delete('/:id', async (request, response) => {
  const decodedToken = jwt.verify(request.token, process.env.SECRET)
  console.log(decodedToken.id)
  console.log(request.token)
   if (!decodedToken.id || !request.token) {
    return response.status(401).json({ error: 'token invalid or missing' })
  }
  const blogToDelete = await Blog.findById(request.params.id)
  if (blogToDelete.user.toString() !== decodedToken.id.toString()) {
    return response.status(403).json({ error: 'You dont have permission to delete this blog' })
  }
  await Blog.findByIdAndDelete(request.params.id)
  response.status(204).end()
})

blogsRouter.put('/:id', async (request, response) => {
  const body = request.body

  const blog = {
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes,
    comments : body.comments
  }

  const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, blog, { new: true }).populate('user', { username: 1, name: 1 })
  response.json(updatedBlog)
})

blogsRouter.post('/:id/comments', async (request, response) => {
  const blog = await Blog.findById(request.params.id)

  if (!blog) {
    return response.status(404).json({ error: 'Blog not found' })
  }

  const { comment } = request.body
  blog.comments = blog.comments.concat(comment)
  const updatedBlog = await blog.save()
  response.json(updatedBlog)
})



module.exports = blogsRouter