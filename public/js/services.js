angular.module('services', [])

.factory('Auth', function ($http, $location, $window) {
  var signin = function (user) {
    return $http({
      method: 'POST',
      url: '/signin',
      data: user
    })
    .then(function (resp) {
      // return resp.data.token;
    });
  };

  return {
    signin: signin
  };
})

.factory('Boards', function ($http) {

  var getAll = function () {
    return $http({
      method: 'GET',
      url: '/getBoards'
    })
    .then(function (resp) {
      return resp.data;
    });
  };

  var getNew = function () {
    return $http({
      method: 'GET',
      url: '/newFromBoards'
    })
    .then(function (resp) {
      return resp.data;
    });
  };

  return {
    getAll: getAll,
    getNew: getNew
  };

});