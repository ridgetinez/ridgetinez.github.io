---
layout: post
title: "Dataflow Analysis I: Introduction & Reaching Definitions" 
description: Learning about the reaching definition analysis problem common in compilers.
summary: For a usage of a variable, we want to know which definitions could have set the value at that point. This type of analysis is used in code editors, debuggers, and further optimisations in compilers.
tags: [compilers, dataflowanalysis]
---
# What's up with this?

Compilers are insane. They seem to itch both the "how the hell do I program this," (engineering) and the "how the hell do I prove this," (math) curiosities that I felt I missed from my CS degree at UNSW. That's not a jab at UNSW as there's plenty of courses that go deep into one of those itches (Advanced Operating Systems I'm looking at you) but few melded the engineering and math in a way that felt satisfying - courses that came close were Ihor Kuz's Distributed Systems and Liam O'Connor's Programming Languages course. I imagine Computer Graphics would've been similarly awesome to take... but unluckily most of the people who could teach it had left, sadge.

So now I'm 13 days out from starting my first full-time job, and a personal quest that I promised to myself as a wee 2nd year student - learn as much about compilers as you can. It was the first topic that wow'd me, presumably because I was head over heels for my "not a Haskell but a Haskell course" (expertly led by Gabrielle Keller and Liam O'Connor) and was probably the first time I experienced that addictive "holy shit, that's cool" feeling. So now I'm going to do 2nd year me proud and continue on that quest - and man oh man, that "holy shit, that's cool" feeling just came back.

# Reaching Definitions

Given a usage of a variable $x$, which definitions in the program could be responsible for the value that $x$ has? We call these the *reaching definitions* for $x$ and through exploring the problem we'll not only come up with an algorithm to this problem, but discover a general framework, providing an almost plug and play solution for other static analyses we'd want in a compiler.

<!-- CFG -->
![basic cfg](/assets/dfa1/basicexample.png)

The above is a control flow graph (CFG) taken from the lovely [Dataflow Analysis notes](https://ucsd-pl.github.io/cse231/wi18/lectures.html) by Sorin Lerner for the UCSD's Advanced Compilers course. Don't let the 'advanced' scare you! It doesn't require previous knowledge, and you can catch his excitement through his oration alone. A CFG is a graph where the nodes are program instructions, and an edge exists from a node V to node W if program control can go from V to W. Our reaching definitions question can then be phrased as: *what definitions could have set the value for x, for the usage of x on node 11.*

Let's proceed with a bit of wishful thinking. What type of data structure would be useful to have when on node 11 to figure out which definitions set `x`? Supposing it was properly formed, we'd like to keep track of a map from variable name to the possibly setting definitions up to this point. Notice that we're talking about a set of definitions, not a single definition, as we're a static analysis and can't run the code to know which branch gets taken for certain. For example, the usage of `x` at node 11 could be from nodes 6 or 9... or 10! For those pondering why 10 can set x, we could have that p contains the address of x.

<!-- update rules -->
![update rules](/assets/dfa1/rules.png)

Updating this set involves traversing through our CFG, and apply rules if the instruction is one of the forms above. We first remove from the set if we're sure that this definition will overwrite all others we've seen before, and then add our new definition to the set. If we did it the other way around, we'd remove the definition we just added in. When we have a node that has more than a single input, we merge these sets by taking the set union as definitions could have come from any of these branches.

But then there's the question of how to traverse through the CFG? Think about a traversal order that makes sense to you for our example. Our example CFG is not only a graph, but a DAG which means that it has a topological traversal order - for example 12,11,7,6,5,10,9,8,4,3,2,1. So one reasonable way to traverse this DAG is in reverse topological order. This corresponds with our intuition of starting from the entry point of our CFG, and we can guarantee that if we visit a node its inputs have already been visited (verify this with the reverse topological order of the example above).

<!-- loop CFG -->
![loop cfg](/assets/dfa1/loopexample.png)

How does this traversal order fair with the above CFG which models a while loop? It doesn't work! We don't have a topological order for a graph with cycles. This example differs in that there's a cycle - so let's try and figure out what the definition set looks like as we go through this cycle!

<!-- iterations -->
![loop iter](/assets/dfa1/loopiter.png)

We stop here as the merge on node 4 for iteration #3 would result in the exact same reaching definition set as iteration #2. When the inputs to a merge were the same as the previous iteration's merge, we can safely stop knowing that there'll be no change to the computed set of reaching definitions. Still, we're stuck on the order to process these nodes, with the cycle making it difficult. It's a little unintuitive, but if processing order is giving us a hard time - why don't we say screw it, and process them in no particular order?

## The Worklist Algorithm
For our cycle example, when the input to an instruction changed, we continued processing, and on coming back around and finding that the inputs were the same as the previous iteration, we could safely stop processing. Let's assign a function to each instruction (node) thats takes as input the reaching definition set coming into the node, and returns the one going out. We call this a flow function. 
1. For each node, initialise its next input reaching definition set as the empty set (as we're not processing these nodes in any order, its as if this is the only instruction in the program hence the reaching definition set would be empty).
2. Apply the node's associated flow function to the input reaching definition set coming into the node. Where the output feeds in as the input for another instruction, update the input to the next instruction(s).
3. Repeat steps 1-2 for nodes that had their inputs change until there are no other nodes to process (all inputs are the same as the previous processing iteration). 

In code this would look like:
```python
for node in nodes:
	IN[node] = empty_set()
do:
	for node in changed(IN, nodes):
		# Update input of node to be union of OUTPUT of the nodes with outgoing 
		# edges pointing to our node.
		IN[node] = union([IN[in_node] for in_node in nodes_with_incoming(node)])
		OUT[node] = apply node's flow function on IN[node]
while(still changes to IN)
```

Does this give correct reaching definition sets at each node? Whenever a node detects its input changed, it recomputes the reaching definition set and sets its new output to that. If that node had an outgoing edge to another node, and if the output had changed from what it previously was, then it'll force those nodes to recompute. Eventually we'll reach a state where all nodes have converged on the state of their inputs, and if not, then the nodes we're waiting on will eventually update themselves.

Another way to see this is that we're treating the CFG as a big dependency graph. When one of the node's output changes, we update all of the nodes that depended on that output as input and so on.

However, the "still changes" while loop condition gives us pause. Does this terminate? Since we're using unions that will monotonically increase the set size, can we keep on adding definitions and never stop? This algorithm terminates as there's a finite number of variable names, as well as a finite number of instructions so the set's size is bounded by `numVariableNamesInProgram * numInstructions`, but for real programs it's safe to say we wouldn't come close to this size! 

# Wrapping Up

I found the leap from thinking about reverse-topological processing order to no order and recompute your flow function output when your input changes to be difficult to accept. It's difficult to accept in the same way as when you look at a difficult step in the proof, and the next step is a leap of logic that you'd never get on your own. Compilers are full of this stuff and despite feeling a little clueless, taking the leap into the difficult step makes it easier to see things like that later down the track. Check out [UCSD's CSE231](https://ucsd-pl.github.io/cse231/wi20/project.html) for projects you can wrangle with along these lines.

The next article in this series will generalise our solution, and be able to apply our generalisation as a framework to solve other optimisation problems like, constant propagation, or figuring out whether a variable is live. We'll dive into lattice structures, fixpoint theory, and finally give a name to this way of looking at problems - Dataflow Analysis.