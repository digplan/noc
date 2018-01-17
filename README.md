# raftsimple
Allow a distributed, replicated logging/state machine system that does not rely on time syncronization.

Log - a text log
Cluster - a group of servers managing a log
Node - a member server of a cluster
Head - a SHA hash representing the current/latest state of the log
Hash - separates transactions
Client - communicates with nodes, like web clients

1. A node starts a cluster, a log may exist or not
2a. A node may join a cluster by specifying an existing cluster node, sending its top level hash
2b. The reply is all the transactions above the hash, the node updates its log
2c. A list of the cluster servers is sent as well
3. A log is maintained which is a list of transactions (lines) separated by a SHA256 hash
4. Every log is started with the hash for a blank string

When a new transaction comes in (from a client),
SAMPLE LOG (with 1 transaction):
````
cbc80bb5c0c0f8944bf73b3a429505ac5cde16644978bc9a1e74c5755f8ca556
someinformation1
someinformation2
someinformation3
01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b
````
