#!/bin/bash

# This script benchmarks the runtime of a specified curl request.
#
# The script performs the following steps:
# 1. Repeats the curl request a specified number of times.
# 2. Measures the time taken for each request using /usr/bin/time.
# 3. Accumulates the time taken for each request.
# 4. Computes the average runtime of the requests.
#
# Usage:
# Save this script in a file, e.g., benchmark_curl.sh, make it executable using:
# chmod +x benchmark_curl.sh
#
# Run it with:
# ./benchmark_curl.sh
#
# Note:
# - Make sure `bc` is installed to handle floating-point arithmetic.
# - Ensure the URL and NUM_REQUESTS variables are correctly set to meet your requirements.
# - This script assumes the server at `http://localhost:8000` is running and accessible.
#
# Variables:
# URL - The URL to which the curl requests are made.
# NUM_REQUESTS - The number of repeated curl requests to measure for calculating the average runtime.

# URL and options for the curl command
URL="http://localhost:8000/search?bbox=-180.0,-90.0,180.0,90&text=dem&datetime=2024-01-01T00:00:00Z/.."

# Number of requests to average
NUM_REQUESTS=10

# Initialize the sum of all runtimes
total_time=0

# Function to perform curl and measure time
measure_time() {
    # Use /usr/bin/time to get real time (--format=': %e' ensures we only capture the time in seconds)
    result=$(/usr/bin/time -f "%e" curl -s -o /dev/null -X GET "${URL}" 2>&1)
    echo $result
}

# Loop to perform multiple requests
for ((i=1; i<=NUM_REQUESTS; i++))
do
    runtime=$(measure_time)
    echo "Request $i: ${runtime} seconds"
    total_time=$(echo "$total_time + $runtime" | bc)
done

# Calculate average time
average_time=$(echo "scale=2; $total_time / $NUM_REQUESTS" | bc)
echo "Average runtime for $NUM_REQUESTS requests: ${average_time} seconds"
