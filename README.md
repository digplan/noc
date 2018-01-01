# raftsimple
Allow a distributed, replicated logging/state machine system that does not rely on time syncronization
1. Must be able to start a node on a specified port, default 6969
2. Must be able to accept log entires from clients
3. Must be able to keep a log and state machine for the node
4. Must be able to keep a list of nodes in the cluster and communicate with other nodes via https
5. Must be able to allow other transport methods
6. Must be able to join a cluster
7. Must be able to be specified as a read-only node, which does not accept log entries from clients
8. Must be able to specify a function that determines what is done in the state machine, when a log entry is accepted
9. The node calculates and keeps a unique hash for each new log entry
10. The hash for the latest log entry accepted by the cluster is called the "head", and is kept by each node

Log entries (on each node) have the states, 
pending (awaiting acceptance by the node)
accepted (accepted by the node, awaiting commit by the 'cluster')
committed (accepted by the cluster)

11. Client sends update to node
12. When a new log entry is received from a client, its state is pending.
12a. It determines if it can be commited, based on if its an acceptable update to the state machine
12b. If not, it fails and returns back a failure code to the client
12c. If so, it calculates a hash for the log entry (time+nodeid+logentry), this is the transaction id for the cluster
13. It accepts the log entry and sends it, along with the hash, and the current head, to all members of the cluster
14. When receiving a new log entry from another node, the node checks the head that was sent against its copy of the head
15. If matches, it sends back a accept message, updates the log entry to a state of accepted. The node must queue any new log entries from clients at this time.
16. If head does not match, it waits a timeout period for other pending log entries
16a. If that timeout expires, it restarts the node

17. When the sender recieves a commit message from a majority of nodes
17a. It sets to committed, notifies the client and sends a commit message to nodes that sent accept messages
18. Nodes accept commit messages, update their head, process the entry, and process their pending queue
