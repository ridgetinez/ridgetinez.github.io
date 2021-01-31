require 'octokit'

Jekyll::Hooks.register :posts, :pre_render do |post|
    octo = Octokit::Client.new(:access_token => ENV['PWEBSITE_GITHUB_ACCESS_TOKEN'])
    repo = "ridgetinez/ridgetinez.github.io"

    issues = octo.list_issues(repo)
    print "Processing #{post.data['title']}... "
    found_issue = issues.find { |issue| issue['title'] == post.data['title'] }

    if found_issue == nil
      # If we don't get a 201 Created, it's easier for us to crash @ build than to deploy a faulty comment thread.
      found_issue = octo.create_issue(repo, post.data['title'], post.data['summary'])
    end

    post.data['issue_num'] = found_issue['number']
    post.data['thread'] = "https://github.com/#{repo}/issues/#{found_issue['number']}"
    post.data['comment_endpoint'] = "https://api.github.com/repos/#{repo}/issues/#{found_issue['number']}/comments"
    puts "✅"
  end