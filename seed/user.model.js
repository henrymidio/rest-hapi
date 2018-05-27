let Joi = require('joi')
// NOTE: Install bcrypt then uncomment the line below
// let bcrypt = require('bcryptjs')
let RestHapi = require('rest-hapi')

// TODO: assign a unique text index to email field

module.exports = function(mongoose) {
  let modelName = 'user'
  let Types = mongoose.Schema.Types
  let Schema = new mongoose.Schema({
    email: {
      type: Types.String,
      unique: true
    },
    password: {
      type: Types.String,
      required: true,
      exclude: true,
      allowOnUpdate: false
    },
    firstName: {
      type: Types.String
    },
    lastName: {
      type: Types.String
    },
    role: {
      type: Types.ObjectId,
      ref: 'role'
    },
    token: {
      type: Types.String,
      allowNull: true,
      exclude: true,
      allowOnUpdate: false,
      allowOnCreate: false
    },
    tokenCreatedAt: {
      type: Types.String,
      allowNull: true,
      exclude: true,
      allowOnUpdate: false,
      allowOnCreate: false
    },
    accountActivated: {
      type: Types.Boolean,
      default: false
    }
  })

  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      associations: {
        role: {
          type: 'MANY_ONE',
          model: 'role'
        },
        groups: {
          type: 'MANY_MANY',
          alias: 'group',
          model: 'group'
        },
        permissions: {
          type: 'MANY_MANY',
          alias: 'permission',
          model: 'permission',
          linkingModel: 'user_permission'
        }
      },
      extraEndpoints: [
        // Password Update Endpoint
        function(server, model, options, Log) {
          Log = Log.bind('Password Update')
          let Boom = require('boom')

          let collectionName = model.collectionDisplayName || model.modelName

          Log.note('Generating Password Update endpoint for ' + collectionName)

          let handler = async function(request, h) {
            try {
              let hashedPassword = model.generatePasswordHash(
                request.payload.password
              )

              await model.findByIdAndUpdate(request.params._id, {
                password: hashedPassword
              })

              return h.response('Password updated.').code(200)
            } catch (err) {
              Log.error(err)
              throw Boom.badImplementation(err)
            }
          }

          server.route({
            method: 'PUT',
            path: '/user/{_id}/password',
            config: {
              handler: handler,
              auth: null,
              description: "Update a user's password.",
              tags: ['api', 'User', 'Password'],
              validate: {
                params: {
                  _id: RestHapi.joiHelper.joiObjectId().required()
                },
                payload: {
                  password: Joi.string()
                    .required()
                    .description("The user's new password")
                }
              },
              plugins: {
                'hapi-swagger': {
                  responseMessages: [
                    { code: 200, message: 'Success' },
                    { code: 400, message: 'Bad Request' },
                    { code: 404, message: 'Not Found' },
                    { code: 500, message: 'Internal Server Error' }
                  ]
                }
              }
            }
          })
        }
      ],
      create: {
        pre: function(payload, Log) {
          let hashedPassword = mongoose
            .model('user')
            .generatePasswordHash(payload.password)

          payload.password = hashedPassword

          return payload
        }
      }
    },

    generatePasswordHash: function(password) {
      let hash = password
      // NOTE: Uncomment these two lines once bcrypt is installed
      // let salt = bcrypt.genSaltSync(10)
      // hash = bcrypt.hashSync(password, salt)
      return hash
    }
  }

  return Schema
}
