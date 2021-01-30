require 'octokit'

Jekyll::Hooks.register :posts, :post_render do |post|
    puts post.data['title']
    puts post.data['commentid'] 
    # octo = Octokit.create_issue("ridgetinez/ridgetinez.github.io", post.data['title'], post.data['summary'])
  end