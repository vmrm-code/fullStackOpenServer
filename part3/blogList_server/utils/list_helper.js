const _ = require('lodash')

const dummy = (blogs) => {
  return 1
}

const totalLikes = (blogs) => {
    return blogs.reduce((sum, blog) => {
        return sum + blog.likes
    }, 0)
}

const favouriteBlog = (blogs) => {
    if (blogs.length === 0) return [];

    const blogWithMostLikes = blogs.reduce((max, blog) =>
        blog.likes > max.likes ? blog : max
    );

    return {
        title: blogWithMostLikes.title,
        author: blogWithMostLikes.author,
        likes: blogWithMostLikes.likes
    };
}

const mostBlogs = (blogs) => {
    if (blogs.length === 0) return []

    const authorsCount = _.countBy(blogs,'author')
    const importantAuthor = _.maxBy(Object.keys(authorsCount), author => authorsCount[author])

    return {
        author: importantAuthor,
        blogs: authorsCount[importantAuthor]
    }
}

const mostLikes = (blogs) => {
    if (blogs.length === 0) return []

    const authorsCount = _.groupBy(blogs,'author')
    console.log("Count: ", authorsCount)
    const authorLikes = _.map(authorsCount, (blogs, author) => ({
    author,
    likes: _.sumBy(blogs, 'likes')
    }));
    console.log("likes: ", authorLikes)
    return _.maxBy(authorLikes, 'likes')
}


module.exports = {
  dummy,
  totalLikes,
  favouriteBlog,
  mostBlogs,
  mostLikes
}