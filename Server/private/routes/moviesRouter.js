(function() {

    'use strict';

    var database = require('../database/database'),
        Promise = require('bluebird'),
        movieUtils = require('../modules/movieUtils');


    // Definition of the routes related with authentication.
    module.exports = function(server) {

        // Route responsible to get all the movies.
        server.get('/api/movies', function(req, res) {

            // Get user in question by cookie
            var user = req.cookies.session.split('-')[0];

            database.getSensitiveData([user])
                .then(function(_info) {

                    database.getAllMovies([_info.id])
                        .then(function(_data) {
                            res.status(200).send(_data);
                        })
                        .catch(function() {
                            res.status(406).send('Oops. Something went wrong!');
                        });
                })
                .catch(function(err) {
                    res.status(406).send('Email is not valid. We could not reference this like to your account.');
                });
        });

        // Route responsible to handle the movie likes
        server.post('/api/movie', function(req, res) {

            // Get user in question by cookie
            var user = req.cookies.session.split('-')[0];
            database.getSensitiveData([user])
                .then(function(info) {

                    database.getReviewedMovies([info.id])
                        .then(function(result) {

                            if (result.length > 0) {

                                database.getMovieByID([req.body.id])
                                    .then(function(recentlyAddedMovie) {

                                        movieUtils.calculate_new_importance_function(result, recentlyAddedMovie, req.body.review)
                                            .then(function(updatedAtributeFunction) {

                                                // best attributes
                                                var bestAtr = [
                                                    updatedAtributeFunction.actors.favorite,
                                                    updatedAtributeFunction.directors.favorite,
                                                    updatedAtributeFunction.genre.favorite,
                                                    updatedAtributeFunction.idletime.favorite,
                                                    updatedAtributeFunction.rated.favorite,
                                                    updatedAtributeFunction.runtime.favorite,
                                                    updatedAtributeFunction.talktime.favorite,
                                                    updatedAtributeFunction.writers.favorite,
                                                    updatedAtributeFunction.year.favorite,
                                                    updatedAtributeFunction.imdb.favorite,
                                                    info.id
                                                ]

                                                database.updateBestAtributes(bestAtr)
                                                    .then(function(w) {
                                                        database.getRatingFunction([info.id])
                                                            .then(function(old_rating_function) {

                                                                movieUtils.adjust_rating_function(old_rating_function[0], updatedAtributeFunction)
                                                                    .then(function(rating_function) {

                                                                        var updating = [
                                                                            Math.round(rating_function.actors * 10000) / 10000,
                                                                            Math.round(rating_function.directors * 10000) / 10000,
                                                                            Math.round(rating_function.genre * 10000) / 10000,
                                                                            Math.round(rating_function.idletime * 10000) / 10000,
                                                                            Math.round(rating_function.rated * 10000) / 10000,
                                                                            Math.round(rating_function.runtime * 10000) / 10000,
                                                                            Math.round(rating_function.talktime * 10000) / 10000,
                                                                            Math.round(rating_function.writers * 10000) / 10000,
                                                                            Math.round(rating_function.year * 10000) / 10000,
                                                                            Math.round(rating_function.imdbrating * 10000) / 10000,
                                                                            Math.round(rating_function.userid * 10000) / 10000,
                                                                        ];

                                                                        database.updateRatingFunction(updating)
                                                                            .then(function() {

                                                                                database.getMovies()
                                                                                    .then(function(movies) {

                                                                                        movieUtils.processNewRatings(movies, updatedAtributeFunction, rating_function)
                                                                                            .then(function(updateRatings) {

                                                                                                database.updateAllMovies(updateRatings, info.id)
                                                                                                    .then(function() {

                                                                                                        database.insertReview([info.id, req.body.id, req.body.review])
                                                                                                            .then(function() {
                                                                                                                res.status(200).send('OK');
                                                                                                            })
                                                                                                            .catch(function() {
                                                                                                                res.status(406).send('Something went wrong on database insertion.');
                                                                                                            })

                                                                                                    })
                                                                                                    .catch(function(err) {
                                                                                                        console.log(err);
                                                                                                        res.status(406).send(err);
                                                                                                    })
                                                                                            })
                                                                                            .catch(function(err) {
                                                                                                console.log(err);
                                                                                                res.status(406).send(err);
                                                                                            })
                                                                                    })
                                                                                    .catch(function(err) {
                                                                                        console.log(err);
                                                                                        res.status(406).send('Something went wrong...');
                                                                                    })
                                                                            })
                                                                            .catch(function(err) {
                                                                                console.log(err);
                                                                                res.status(406).send('Something went wrong...');
                                                                            })
                                                                    })
                                                                    .catch(function(err) {
                                                                        console.log(err);
                                                                        res.status(406).send('Something went wrong...');
                                                                    });
                                                            })
                                                            .catch(function(err) {
                                                                console.log(err);
                                                                res.status(406).send('Something went wrong...');
                                                            });
                                                    })
                                                    .catch(function(err) {
                                                        console.log(err);
                                                        res.status(406).send('Something went wrong...');
                                                    })
                                            })
                                            .catch(function(err) {
                                                console.log(err);
                                                res.status(406).send('Something went wrong...');
                                            })
                                    })
                                    .catch(function(err) {
                                        res.status(406).send('Something went wrong...');
                                    });

                            } else {

                                database.insertReview([info.id, req.body.id, req.body.review])
                                    .then(function() {
                                        res.status(200).send('OK');
                                    })
                                    .catch(function() {
                                        res.status(406).send('Something went wrong on database insertion.');
                                    })
                            }
                        })
                        .catch(function(_err) {
                            res.status(406).send('Something went wrong...');
                        });

                })
                .catch(function(err) {
                    res.status(406).send('There was something wrong.');
                });
        });

        // Route that returns all reviewed movies from the requester
        server.get('/api/movies/reviewed', function(req, res) {

            // Get user in question by cookie
            var user = req.cookies.session.split('-')[0];

            database.getSensitiveData([user])
                .then(function(_info) {
                    database.getReviewedMovies([_info.id])
                        .then(function(result) {
                            res.status(200).send(result);
                        })
                        .catch(function(err) {
                            res.status(406).send(err);
                        });
                })
                .catch(function(err) {
                    res.status(406).send('Email is not valid. We could not resolve your request.');
                });
        });

        // Route that returns all liked movies from the requester
        server.get('/api/movies/liked', function(req, res) {

            // Get user in question by cookie
            var user = req.cookies.session.split('-')[0];

            database.getSensitiveData([user])
                .then(function(_info) {
                    database.getLikedMovies([_info.id])
                        .then(function(result) {
                            res.status(200).send(result);
                        })
                        .catch(function(err) {
                            res.status(406).send(err);
                        });
                })
                .catch(function(err) {
                    res.status(406).send('Email is not valid. We could not resolve your request.');
                });
        });

        // Route that returns all rated movies from the requester
        server.get('/api/movies/rated', function(req, res) {

            // Get user in question by cookie
            var user = req.cookies.session.split('-')[0];

            database.getSensitiveData([user])
                .then(function(_info) {
                    database.getRatedMoviesForUser([_info.id])
                        .then(function(result) {

                            database.getBestAttributes([_info.id])
                                .then(function(favorites) {


                                    var randomIndice = Math.floor(Math.random() * 9) + 1;

                                    // get indice
                                    var favParam = '',
                                        index = 0;

                                    for (var i in favorites) {

                                        if (randomIndice == index) {
                                            favParam = i;
                                        }

                                        index++;
                                    }

                                    if (favParam == 'runtime' || favParam == 'talktime' || favParam == 'idletime') {
                                        favorites[favParam] = favorites[favParam].slice(0, favorites[favParam].length - 1);
                                    } else if (favParam == 'year') {
                                        if (!Number(favorites[favParam]) < 20) {
                                            favorites[favParam] = '19' + favorites[favParam].slice(0, 1);
                                        } else {
                                            favorites[favParam] = '20' + favorites[favParam].slice(0, 1);
                                        }
                                    } else if (favParam == 'imdbrating') {
                                        favorites[favParam] = favorites[favParam].slice(0, 2);
                                    }

                                    database.getMoviesWithFavParam(favParam, favorites[favParam], _info.id)
                                        .then(function(Fav) {

                                            for (var i = 0; i < Fav.length; i++) {
                                                Fav[i].like = favParam;
                                            }


                                            result[0].like = 'Rating';
                                            result[1].like = 'Rating';

                                            var toReturn = [];

                                            if (Fav.length > 0) {
                                                toReturn.push(Fav[0]);
                                                toReturn.push(result[0]);
                                            } else {
                                                toReturn.push(result[0]);
                                                toReturn.push(result[1]);
                                            }

                                            res.status(200).send(toReturn);
                                        })
                                        .catch(function(err) {
                                            console.log(err);
                                            res.status(406).send(err);
                                        })
                                })
                                .catch(function(err) {
                                    res.status(406).send(err);
                                })
                        })
                        .catch(function(err) {
                            res.status(406).send(err);
                        });
                })
                .catch(function(err) {
                    res.status(406).send('Email is not valid. We could not resolve your request.');
                });
        });

        server.get('/test', function(req, res) {

            database.getReviewedMovies([3])
                .then(function(result) {

                    if (result.length > 0) {

                        database.getMovieByID([102])
                            .then(function(recentlyAddedMovie) {

                                movieUtils.calculate_new_importance_function(result, recentlyAddedMovie)
                                    .then(function(updatedAtributeFunction) {

                                        database.getRatingFunction([3])
                                            .then(function(old_rating_function) {

                                                movieUtils.adjust_rating_function(old_rating_function[0], updatedAtributeFunction)
                                                    .then(function(rating_function) {

                                                        var updating = [
                                                            rating_function.actors,
                                                            rating_function.directors,
                                                            rating_function.genre,
                                                            rating_function.idletime,
                                                            rating_function.rated,
                                                            rating_function.runtime,
                                                            rating_function.talktime,
                                                            rating_function.writers,
                                                            rating_function.year,
                                                            rating_function.imdbrating,
                                                            rating_function.userid,
                                                        ];

                                                        database.updateRatingFunction(updating)
                                                            .then(function() {

                                                                database.getMovies()
                                                                    .then(function(movies) {

                                                                        movieUtils.processNewRatings(movies, updatedAtributeFunction, rating_function)
                                                                            .then(function(updateRatings) {

                                                                                database.updateAllMovies(updateRatings, 3)
                                                                                    .then(function() {
                                                                                        res.status(200).send(updatedAtributeFunction);
                                                                                    })
                                                                                    .catch(function(err) {
                                                                                        res.status(406).send(err);
                                                                                    })
                                                                            })
                                                                            .catch(function(err) {
                                                                                console.log(err);
                                                                                res.status(406).send(err);
                                                                            })
                                                                    })
                                                                    .catch(function(err) {
                                                                        res.status(406).send('Something went wrong...');
                                                                    })
                                                            })
                                                            .catch(function(err) {
                                                                res.status(406).send('Something went wrong...');
                                                            })
                                                    })
                                                    .catch(function(err) {
                                                        console.log(err);
                                                        res.status(406).send('Something went wrong...');
                                                    });
                                            })
                                            .catch(function(err) {
                                                res.status(406).send('Something went wrong...');
                                            });
                                    })
                                    .catch(function(err) {
                                        console.log(err);
                                        res.status(406).send('Something went wrong...');
                                    })
                            })
                            .catch(function(err) {
                                res.status(406).send('Something went wrong...');
                            });
                    } else {
                        res.status(406).send('Not a single thing to evaluate');
                    }
                })
                .catch(function(_err) {
                    res.status(406).send('Something went wrong...');
                });
        });

    };
}());
