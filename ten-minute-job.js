const axios = require('axios');

function massUpdate() {
	axios({
		method: 'put',
		url: 'https://hidden-oasis-88699.herokuapp.com/users/updatetopten',
	}).then((response) => {
		console.log(response.data);
		axios({
			method: 'put',
			url:
				'https://hidden-oasis-88699.herokuapp.com/activities/massactivitiesupdate',
		}).then((response) => {
			console.log(response.data);
		});
	});
	axios({
		method: 'put',
		url: 'https://hidden-oasis-88699.herokuapp.com/clans/updateclans',
	}).then((response) => {
		console.log(response);
	});
}
massUpdate();
