#include <gtest/gtest.h>
#include <stdexcept>
#include <string>
#include <vector>

// Mock classes for testing (replace with your actual headers)
class ExampleClass
{
public:
    void exampleMethod()
    {
        std::cout << "Example method from GitHub repo" << std::endl;
    }

    int getValue() const { return 42; }
    std::string getName() const { return "ExampleClass"; }
};

class GitHubRepositoryAnalysis
{
public:
    GitHubRepositoryAnalysis() : numFiles(0), repositoryName("") {}

    GitHubRepositoryAnalysis(const std::string &repoName, int files)
        : repositoryName(repoName), numFiles(files)
    {
        if (files < 0)
        {
            throw std::invalid_argument("Number of files cannot be negative");
        }
    }

    int getNumFiles() const { return numFiles; }
    std::string getRepositoryName() const { return repositoryName; }

    void addFile() { numFiles++; }
    void removeFile()
    {
        if (numFiles <= 0)
        {
            throw std::runtime_error("Cannot remove file from empty repository");
        }
        numFiles--;
    }

    bool isEmpty() const { return numFiles == 0; }

private:
    std::string repositoryName;
    int numFiles;
};

// Test fixture for ExampleClass
class ExampleClassTest : public ::testing::Test
{
protected:
    void SetUp() override
    {
        exampleClass = std::make_unique<ExampleClass>();
    }

    void TearDown() override
    {
        exampleClass.reset();
    }

    std::unique_ptr<ExampleClass> exampleClass;
};

// Test fixture for GitHubRepositoryAnalysis class
class GitHubRepositoryAnalysisTest : public ::testing::Test
{
protected:
    void SetUp() override
    {
        // Initialize with default values
    }

    void TearDown() override
    {
        // Clean up after each test
    }
};

// ExampleClass Tests
TEST_F(ExampleClassTest, GetValueReturnsExpectedValue)
{
    EXPECT_EQ(42, exampleClass->getValue());
}

TEST_F(ExampleClassTest, GetNameReturnsExpectedName)
{
    EXPECT_EQ("ExampleClass", exampleClass->getName());
}

TEST_F(ExampleClassTest, ExampleMethodDoesNotThrow)
{
    EXPECT_NO_THROW(exampleClass->exampleMethod());
}

// GitHubRepositoryAnalysis Tests
TEST_F(GitHubRepositoryAnalysisTest, DefaultConstructor)
{
    GitHubRepositoryAnalysis analysis;
    EXPECT_EQ(0, analysis.getNumFiles());
    EXPECT_EQ("", analysis.getRepositoryName());
    EXPECT_TRUE(analysis.isEmpty());
}

TEST_F(GitHubRepositoryAnalysisTest, ParameterizedConstructor)
{
    GitHubRepositoryAnalysis analysis("test-repo", 5);
    EXPECT_EQ(5, analysis.getNumFiles());
    EXPECT_EQ("test-repo", analysis.getRepositoryName());
    EXPECT_FALSE(analysis.isEmpty());
}

TEST_F(GitHubRepositoryAnalysisTest, ConstructorWithZeroFiles)
{
    GitHubRepositoryAnalysis analysis("empty-repo", 0);
    EXPECT_EQ(0, analysis.getNumFiles());
    EXPECT_TRUE(analysis.isEmpty());
}

TEST_F(GitHubRepositoryAnalysisTest, ConstructorThrowsOnNegativeFiles)
{
    EXPECT_THROW(GitHubRepositoryAnalysis("invalid-repo", -1), std::invalid_argument);
}

TEST_F(GitHubRepositoryAnalysisTest, AddFileIncreasesCount)
{
    GitHubRepositoryAnalysis analysis("test-repo", 3);
    int initialCount = analysis.getNumFiles();

    analysis.addFile();

    EXPECT_EQ(initialCount + 1, analysis.getNumFiles());
    EXPECT_FALSE(analysis.isEmpty());
}

TEST_F(GitHubRepositoryAnalysisTest, RemoveFileDecreasesCount)
{
    GitHubRepositoryAnalysis analysis("test-repo", 3);
    int initialCount = analysis.getNumFiles();

    analysis.removeFile();

    EXPECT_EQ(initialCount - 1, analysis.getNumFiles());
}

TEST_F(GitHubRepositoryAnalysisTest, RemoveFileFromEmptyThrows)
{
    GitHubRepositoryAnalysis analysis("empty-repo", 0);

    EXPECT_THROW(analysis.removeFile(), std::runtime_error);
    EXPECT_EQ(0, analysis.getNumFiles()); // Count should remain unchanged
}

TEST_F(GitHubRepositoryAnalysisTest, RemoveFileFromSingleFile)
{
    GitHubRepositoryAnalysis analysis("single-file-repo", 1);

    analysis.removeFile();

    EXPECT_EQ(0, analysis.getNumFiles());
    EXPECT_TRUE(analysis.isEmpty());
}

TEST_F(GitHubRepositoryAnalysisTest, MultipleAddAndRemoveOperations)
{
    GitHubRepositoryAnalysis analysis("test-repo", 2);

    // Add files
    analysis.addFile();
    analysis.addFile();
    EXPECT_EQ(4, analysis.getNumFiles());

    // Remove files
    analysis.removeFile();
    analysis.removeFile();
    EXPECT_EQ(2, analysis.getNumFiles());

    // Remove original files
    analysis.removeFile();
    analysis.removeFile();
    EXPECT_EQ(0, analysis.getNumFiles());
    EXPECT_TRUE(analysis.isEmpty());
}

// Parameterized tests for boundary values
class GitHubRepositoryAnalysisBoundaryTest : public ::testing::TestWithParam<int>
{
protected:
    void SetUp() override
    {
        testValue = GetParam();
    }

    int testValue;
};

TEST_P(GitHubRepositoryAnalysisBoundaryTest, BoundaryValueConstructor)
{
    if (testValue >= 0)
    {
        GitHubRepositoryAnalysis analysis("test-repo", testValue);
        EXPECT_EQ(testValue, analysis.getNumFiles());
    }
    else
    {
        EXPECT_THROW(GitHubRepositoryAnalysis("test-repo", testValue), std::invalid_argument);
    }
}

INSTANTIATE_TEST_SUITE_P(
    BoundaryValues,
    GitHubRepositoryAnalysisBoundaryTest,
    ::testing::Values(-1, 0, 1, 100, 1000));

int main(int argc, char **argv)
{
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}