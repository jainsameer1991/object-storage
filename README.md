# object-storage

Object storage is a data storage architecture that manages data as objects, as opposed to other storage architectures like file systems which manage data as a file hierarchy, or block storage which manages data as blocks within sectors and tracks. Each object typically includes the data itself, a variable amount of metadata, and a unique identifier. Object storage is highly scalable and is commonly used for storing large amounts of unstructured data such as photos, videos, backups, and log files. Popular examples include Amazon S3, Google Cloud Storage, and Azure Blob Storage.

---

## Distributed Object Storage Simulation (Java 21 & Spring Boot 3.x)

This project simulates a distributed object storage system inspired by modern cloud architectures, using Java 21 and Spring Boot 3.x. The simulation models the data flow and core components of a scalable, highly available, and strongly consistent object storage backend.

### **Architecture Overview**

The system is composed of the following components:
- **Client**: Initiates GET requests for objects.
- **Front-End Service**: Handles API requests, authentication, and routing.
- **Partition Manager**: Maps logical object partitions to physical storage nodes.
- **Partition Server**: Manages object metadata and coordinates data access.
- **Stream Manager**: Tracks physical storage extents (data blocks).
- **Extent Node**: Stores the actual object data.

### **Features**

- **Distributed Architecture Simulation**: Multi-component system that mimics real-world cloud object storage architectures with separate services for different responsibilities.
- **Partition-Based Storage Management**: Intelligent mapping of logical object partitions to physical storage nodes for optimal data distribution and retrieval.
- **Strong Consistency Model**: Ensures data consistency across distributed components, maintaining reliability in concurrent access scenarios.
- **Scalable Extent Management**: Efficient tracking and management of physical storage extents (data blocks) to support large-scale object storage operations.
- **High Availability Design**: Fault-tolerant architecture that maintains service availability even when individual components experience issues.
- **RESTful API Interface**: Clean and intuitive API endpoints for object storage operations following industry-standard REST principles.
- **Comprehensive Request Tracing**: Detailed logging of each step in the data flow to provide visibility into distributed system operations.

### **GET Operation Data Flow**

1. **Client → Front-End**: Sends GET request for an object.
2. **Front-End → Partition Manager**: Looks up which Partition Server holds the object.
3. **Partition Manager → Front-End**: Returns the address of the responsible Partition Server.
4. **Front-End → Partition Server**: Forwards the GET request.
5. **Partition Server → Stream Manager**: Requests location of the data extent.
6. **Stream Manager → Partition Server**: Returns extent location(s).
7. **Partition Server → Extent Node**: Requests the actual data.
8. **Extent Node → Partition Server**: Returns the data.
9. **Partition Server → Front-End**: Sends data back.
10. **Front-End → Client**: Delivers the data to the client.

### **Technologies Used**
- Java 21
- Spring Boot 3.x

### **How to Run**
- Each component can be implemented as a separate Spring Boot service or as modules within a single application for simulation purposes.
- The simulation logs each step of the GET operation to demonstrate the distributed data flow.

### **References**
- [Windows Azure Storage: A Highly Available Cloud Storage Service with Strong Consistency](https://www.cs.purdue.edu/homes/csjgwang/CloudNativeDB/AzureStorageSOSP11.pdf)
- [Azure Storage Documentation](https://learn.microsoft.com/en-us/azure/storage/)

---

This project is for educational purposes and demonstrates distributed systems concepts such as partitioning, replication, and strong consistency in object storage systems.
