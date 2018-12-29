#!/usr/bin/env node

/*globals require, process, console */

'use strict';

var options, state, queue,

cli = require('commander'),
fs = require('fs'),
path = require('path'),
escomplex = require('typhonjs-escomplex'),
async = require('async');
const ComplexityReporter  = require('complexity-reporters')

// Node v0.10 polyfill for process.exitCode
process.on('exit', function(code) {
    process.exit(code || process.exitCode);
});

parseCommandLine();

state = {
    sources: {
        js: []
    }
};

expectFiles(cli.args, cli.help.bind(cli));
queue = async.queue(readFile, cli.maxfiles);
processPaths(cli.args, function() {
});

function parseCommandLine () {
    var config;

    cli.
        usage('[options] <path>').
        option('-c, --config <path>', 'specify path to configuration JSON file').
        option('-o, --output <path>', 'specify an output file for the report').
        option('-f, --format <format>', 'specify the output format of the report').
        option('-e, --ignoreerrors', 'ignore parser errors').
        option('-a, --allfiles', 'include hidden files in the report').
        option('-p, --filepattern <pattern>', 'specify the files to process using a regular expression to match against file names').
        option('-P, --dirpattern <pattern>', 'specify the directories to process using a regular expression to match against directory names').
        option('-x, --excludepattern <pattern>', 'specify the the directories to exclude using a regular expression to match against directory names').
        parse(process.argv);

    cli.maxfiles = 1024;

    options = {
        logicalor: false,
        switchcase: true,
        forin: false,
        trycatch: false,
        newmi: true,
        ignoreErrors: cli.ignoreerrors || false,
        noCoreSize: true
    };

    if (!cli.filepattern) {
        cli.filepattern = '\\.(j|t)sx?$';
    }
    cli.filepattern = new RegExp(cli.filepattern);

    if (cli.dirpattern) {
        cli.dirpattern = new RegExp(cli.dirpattern);
    }

    if (cli.excludepattern) {
        cli.excludepattern = new RegExp(cli.excludepattern);
    }


}

function expectFiles (paths, noFilesFn) {
    if (paths.length === 0) {
        noFilesFn();
    }
}

function processPaths (paths, cb) {
    async.each(paths, processPath, function(err) {
        if (err) {
            error('readFiles', err);
        }
        queue.drain = function() {
            getReports();
            cb();
        };
    });
}

function processPath(p, cb) {
    fs.stat(p, function(err, stat) {
        if (err) {
            return cb(err);
        }
        if (stat.isDirectory()) {
            if ((!cli.dirpattern || cli.dirpattern.test(p)) && (!cli.excludepattern || !cli.excludepattern.test(p))) {
                return readDirectory(p, cb);
            }
        } else if (cli.filepattern.test(p)) {
            queue.push(p);
        }
        cb();
    });
}

function readDirectory (directoryPath, cb) {
    fs.readdir(directoryPath, function(err, files) {
        if (err) {
            return cb(err);
        }
        files = files.filter(function (p) {
            return path.basename(p).charAt(0) !== '.' || cli.allfiles;
        }).map(function (p) {
            return path.resolve(directoryPath, p);
        });
        if (!files.length) {
            return cb();
        }
        async.each(files, processPath, cb);
    });
}

function readFile(filePath, cb) {
    fs.readFile(filePath, 'utf8', function (err, source) {
        if (err) {
            error('readFile', err);
        }

        if (beginsWithShebang(source)) {
            source = commentFirstLine(source);
        }

        setSource(filePath, source);
        cb();
    });
}

function error (functionName, err) {
    console.error(err)
    process.exit(1);
}

function beginsWithShebang (source) {
    return source[0] === '#' && source[1] === '!';
}

function commentFirstLine (source) {
    return '//' + source;
}

function setSource (modulePath, source) {
    var type = getType(modulePath);
    state.sources[type].push({
        srcPath: modulePath,
        code: source
    });
}

function getType(modulePath) {
    return path.extname(modulePath).replace('.', '');
}

function getReports () {
    try {
        writeReports(escomplex.analyzeProject(state.sources.js, options, {allowReturnOutsideFunction: true}));
    } catch (err) {
        error('getReports', err);
    }
}

function writeReports (aComplexityReport) {
    const reporter =  new ComplexityReporter(aComplexityReport)
    var formatted;
    switch(cli.format) {
        case 'json': 
            formatted = reporter.json
            break;
        default:
            formatted = reporter.json
            break;
    }

    if (cli.output) {
        fs.writeFile(cli.output, formatted, 'utf8', function (err) {
            if (err) {
                error('writeReport', err);
            }
        });
    } else {
        console.log(formatted); // eslint-disable-line no-console
    }
}
