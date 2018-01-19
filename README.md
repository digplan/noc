# noc
Not opinionated consensus

A distributed, replicated log, which doesn't require time syncronization between nodes, and is not tied to specific implementations, transports, or state machines.  noc may be used to syncronize a log between several servers (nodes), with or without an associated state machine.  noc logs may represent changes to a distributed database, or to an *individual record* in a distributed database.

noc isn't implentation dependent, so nodes may exist in what would be typically called *client* or *server* applications.  So a traditional HTTP server may be node, but connected clients may also be nodes in the cluster.  It isn't transport dependent, so besides the most obvious means of communication between nodes (TCP), implmentations may have nodes communicate via SSH or other mechanisms.

noc is for "logging", not in the traditonal sense of server logging, but capturing changes, usually with an associated state machine.  For instance, in an HTTP "CRUD" application, an indvidual INSERT request would be a log entry, the state machine is the database it's inserting into.  noc does not decide the implementation of the associated state machine.  You can choose not to have one, or create custom state machine implementations.  The reference JavaScript application provides a basic state machine, which is simply a JSON object in memory.

In noc, the following are defined:

Cluster - a group of applications, usually one per server, that share a replicated log

Log - a replicated log, a text file that is replicated across a number of nodes

noc Cluster log - a special type of log, created at cluster startup, used by the nodes to track the other nodes in the cluster

Log item - an individual line in the log

Node - an individual application/server, member of a cluster

Head - a SHA256 hash value representing the current state of the log on a node, and timestamp all nodes in a cluster must share the same head value, in order to consider the log consistent/valid

Transation - an individual set of log entries, which is replicated across nodes

Commit request - a request made by a node, specific to a transaction, to the other nodes in the cluster, to confirm the transaction can be committed

State Machine - an underlying representation of state, whose changes are expressed in a log.  noc does not dictate what these state machines *are*, in fact, using State machines with NOC

Timestamp - a UNIX epoch time value, which represents the cluster 'time' of the commit

Refresh message - a request to the cluster for a refresh of the named log.  For logs that have backing state machines, a lighter "snapshot" may be requested.

Snapshot - a special type of refresh that a node issues to the cluster, to request only the state machine and current HEAD of the log, instead of the entire log/transaction history. The node will then replicate logs, going forward from that point.

Transport - the means by which nodes communicate.  Most common would be TCP, but can be implemented in any way, for instance HTTPS, SSH, or even between shared memory or text files on a single computer.

Deregistration - removing a node from a cluster

##Log
A log is a text file, separated by \r\n.  The last line in the file is the initial HEAD line, which is a SHA256 value and timestamp.  Timestamps are interesting.  They are UNIX epoch 'timestamps', for instance, 1516324544821 which is Thu Jan 18 2018 19:15:44 GMT-0600 (Central Standard Time), but nodes in a noc cluster are not time syncronized.  Each node is assumed to have a different time.  So, this timestamp represents an artificial "cluster time", and may be used to process a log according to the time of an individual commit.

A log may look like this.  This log as a single transaction, of two statements (log lines).  The top line is the "HEAD", or current state of the log file, and is the SHA256 hash of the transaction plus the line below (the previous HEAD). The bottom line is the initial HEAD of the log.
````
ECDAFC73E572A52AE503C03E74B7F1E251116F1B553F08B6E09D57E65650BC89 1516324944522
INSERT INTO Customers (CustomerName) VALUES ('Bengal');
INSERT INTO Customers (CustomerName) VALUES ('Cardinal');
36A9E7F1C95B82FFB99743E0C5C4CE95D83C9A430AAC59F84EF3CBFAB6145068 1516324544821
````

##Node
A node creates new, or joins, a cluster.  It composes a transaction of one or more lines, for instance, getting it from an HTTP client, and calculates a new HEAD (SHA256 hash), consisting of the existing HEAD (top line of the log) and the new transaction lines. Then, it generates a Commmit Request to the other nodes in the cluster.  They check their HEAD value against that sent by the requestor, if it matches, they send back an affirmative response, if not they send back a failure response.

The requestor, upon getting successful responses from all the nodes of the cluster, "commits" the transaction, updating its own log and sending a Commit message to all the other nodes, who update their logs.

##State machine
If a state machine is defined for a log, a log update will update that state machine.  This is usually a database of some kind, but having a state machine for a log is optional.  noc does not define implementations of the state machine, so a state machine may be a database file stored on disk or in memory, a connection to another system or database.  Defining a state machine is as simple as a single function, called UPDATE.  For instance, an in-memory web browser JSON object state machine may be defined like this.
````
const inMemJSON = {
  update: v => {
    window.db = window.db || []
    window.db.push(v)
  }
}
````

##Log write
While a log must be a text file separated by line breaks, with HEAD lines that separate the transactions, the actual implementation of the log storage is not defined by noc.  So, logs may be stored in memory, on disk, or even on network resources.

##Cluster and Node startup
Each node can maintain any number of logs and state machines, as much as computing resources allow.  The only other data the node must know, is the names of the other nodes in the cluster in order to communicate with them.  

This information itself is tracked as a noc log and state machine, called the "noc cluster log".    

The first node in a cluster "inits" the cluster, and creates the "noc cluster directory".  This simply tracks the members of the cluster and is kept as a log and state machine in each node.  Subsequent nodes send a commit request to the cluster to join the cluster, and if confirmed, sends a refresh message to get up to date with the cluster.

noc expects ALL nodes in the cluster to ALWAYS be ready and responding.  When any node is not responsive, the cluster is considered *partially disabled*.  When the node becomes operational again, it can request a refresh from the cluster, but if nodes are unresponsive for an extended amount of time, they are removed from the cluster.
