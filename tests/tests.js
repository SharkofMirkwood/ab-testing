/**
 * Created by xavi on 14/12/14.
 */

var should = require('chai').should(),
    db = require('mongoose'),
    ABTesting = require('../index');

db.connect('mongodb://localhost/test');

var Account = db.model('Account', { email : String, testGroup : String });

describe('Init', function() {
    it('should work with a default weight', function () {
        var abTest = ABTesting.createTest('test', [{ name : 'A' },{ name : 'B' }]);

        var account = new Account({ email : 'alice@example.com', testGroup : abTest.getGroup('alice@example.com') });

        account.testGroup.should.match(/^[A|B]/);
    });
    it('should work with weights smaller than 1', function () {
        var abTest = ABTesting.createTest('test', [{ name : 'A', weight : 0.3 },{ name : 'B', weight: 0.3 }]);

        var account = new Account({ email : 'bob@example.com', testGroup : abTest.getGroup('bob@example.com') });

        account.testGroup.should.match(/^[A|B]/);
    });
    it('should work with weights bigger than 1', function () {
        var abTest = ABTesting.createTest('test', [{ name : 'A', weight : 30 },{ name : 'B', weight: 30 }]);

        var account = new Account({ email : 'bob@example.com', testGroup : abTest.getGroup('bob@example.com') });

        account.testGroup.should.match(/^[A|B]/);
    });
});

describe('Test', function () {
    it('should execute the correct function for Alice', function() {
        var abTest = ABTesting.createTest('test', [{ name : 'A' },{ name : 'B' }]);

        var account = new Account({ email : 'alice@example.com', testGroup : abTest.getGroup('alice@example.com') });
        abTest.test(account.testGroup, [
            function () {
                account.testGroup.should.equal('A');
            },
            function() {
                account.testGroup.should.equal('B');
            }
        ]);
    });
    it('should execute the correct function for Bob', function() {
        var abTest = ABTesting.createTest('test', [{ name : 'A' },{ name : 'B' }]);

        var account = new Account({ email : 'bob@example.com', testGroup : abTest.getGroup('bob@example.com') });
        abTest.test(account.testGroup, [
            function () {
                account.testGroup.should.equal('A');
            },
            function() {
                account.testGroup.should.equal('B');
            }
        ]);
    });
    it('should execute with the correct scope', function() {
        var abTest = ABTesting.createTest('test', [{ name : 'A' },{ name : 'B' }]);
        this.foo = "foo";
        var account = new Account({ email : 'bob@example.com', testGroup : abTest.getGroup('bob@example.com') });
        abTest.test(account.testGroup, [
            function () {
                account.testGroup.should.equal('A');
                this.foo.should.equal('foo');
            },
            function() {
                account.testGroup.should.equal('B');
                this.foo.should.equal('foo');
            }
        ], this);
    });
    it('should return error if the user group does not match any test', function () {
        var abTest = ABTesting.createTest('test', [{ name : 'A' },{ name : 'B' }]);

        try {
            abTest.test('nonExistingGroup', [
                function () {
                    should.throw.error();
                },
                function() {
                    should.throw.error();
                }
            ]);
        } catch (err) {
            err.should.exist();
        }
    });
});

describe('Different number of experiments', function () {
    it('should accept 3 experiments', function () {
        var abTest = ABTesting.createTest('test', [{ name: 'A'}, { name: 'B'}, { name: 'C'}]);
        var username = 'username@example.com';

        abTest.getGroup(username).should.be.equal('C');
    });
    it('should hit only one test if the weight of the others is 0', function () {
        var config = [
            { name: 'A', weight: 1},
            { name: 'B', weight: 0},
            { name: 'C', weight: 0}
        ];
        var abTest = ABTesting.createTest('test', config);
        var username = Math.random().toString();

        for(var i = 0; i < 100; i++) {
            abTest.getGroup(username).should.be.equal('A');
            username = Math.random().toString();
        }
    })
})

describe('More than one A/B test', function () {
    it('should accept more than one test', function () {
        var testOne = ABTesting.createTest('test1', [{ name: 'A'}, { name: 'B'}]);
        var testTwo = ABTesting.createTest('test2', [{ name: 'ATest'}, { name: 'BTest'}]);

        var testOneGroup = testOne.getGroup('username');
        var testTwoGroup = testTwo.getGroup('anotherUsername');

        testOne.test(testOneGroup, [
            function () {
                testOneGroup.should.be.equal('A');
            },
            function () {
                testOneGroup.should.be.equal('B');
            }
        ], this);

        testTwo.test(testTwoGroup, [
            function () {
                testTwoGroup.should.be.equal('ATest');
            },
            function () {
                testTwoGroup.should.be.equal('BTest');
            }
        ], this);
    });
    it('should return correct test name', function () {
        var testOne = ABTesting.createTest('test1', [{ name: 'A'}, { name: 'B'}]);
        var testTwo = ABTesting.createTest('test2', [{ name: 'A'}, { name: 'B'}]);

        var testOneGroup = testOne.getGroup('username');
        var testTwoGroup = testTwo.getGroup('anotherUsername');

        var testOneName = testOne.getName();
        var testTwoName = testTwo.getName();

        testOneName.should.be.equal('test1');
        testTwoName.should.be.equal('test2');

        testOne.test(testOneGroup, [
            function () {
                testOneGroup.should.be.equal('A');
            },
            function () {
                testOneGroup.should.be.equal('B');
            }
        ], this);

        testTwo.test(testTwoGroup, [
            function () {
                testTwoGroup.should.be.equal('A');
            },
            function () {
                testTwoGroup.should.be.equal('B');
            }
        ], this);
    });
    it('should return same groups for the same test names', function () {
        var testOne = ABTesting.createTest('test1', [{ name: 'A'}, { name: 'B'}]);
        var testTwo = ABTesting.createTest('test1', [{ name: 'A'}, { name: 'B'}]);
        var username = 'testUsername';

        testOne.getGroup(username).should.be.equal(testTwo.getGroup(username));
    });

    it('should return different groups for different tests', function () {
        var testOne = ABTesting.createTest('test1', [{ name: 'A'}, { name: 'B'}]);
        var testTwo = ABTesting.createTest('test2', [{ name: 'C'}, { name: 'D'}]);
        var username = 'testUsername';

        testOne.getGroup(username).should.not.be.equal(testTwo.getGroup(username));
    });
});
