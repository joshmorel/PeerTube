/* tslint:disable:no-unused-expression */

import * as chai from 'chai'
import 'mocha'
import { ServerStats } from '../../../../shared/models/server/server-stats.model'
import {
  createUser,
  doubleFollow,
  flushAndRunMultipleServers,
  follow,
  killallServers,
  ServerInfo,
  uploadVideo,
  viewVideo,
  wait
} from '../../../../shared/utils'
import { flushTests, setAccessTokensToServers } from '../../../../shared/utils/index'
import { getStats } from '../../../../shared/utils/server/stats'
import { addVideoCommentThread } from '../../../../shared/utils/videos/video-comments'
import { waitJobs } from '../../../../shared/utils/server/jobs'

const expect = chai.expect

describe('Test stats (excluding redundancy)', function () {
  let servers: ServerInfo[] = []

  before(async function () {
    this.timeout(60000)

    await flushTests()
    servers = await flushAndRunMultipleServers(3)
    await setAccessTokensToServers(servers)

    await doubleFollow(servers[0], servers[1])

    const user = {
      username: 'user1',
      password: 'super_password'
    }
    await createUser(servers[0].url, servers[0].accessToken, user.username, user.password)

    const resVideo = await uploadVideo(servers[0].url, servers[0].accessToken, { fixture: 'video_short.webm' })
    const videoUUID = resVideo.body.video.uuid

    await addVideoCommentThread(servers[0].url, servers[0].accessToken, videoUUID, 'comment')

    await viewVideo(servers[0].url, videoUUID)

    // Wait the video views repeatable job
    await wait(8000)

    await follow(servers[2].url, [ servers[0].url ], servers[2].accessToken)
    await waitJobs(servers)
  })

  it('Should have the correct stats on instance 1', async function () {
    const res = await getStats(servers[0].url)
    const data: ServerStats = res.body

    expect(data.totalLocalVideoComments).to.equal(1)
    expect(data.totalLocalVideos).to.equal(1)
    expect(data.totalLocalVideoViews).to.equal(1)
    expect(data.totalLocalVideoFilesSize).to.equal(218910)
    expect(data.totalUsers).to.equal(2)
    expect(data.totalVideoComments).to.equal(1)
    expect(data.totalVideos).to.equal(1)
    expect(data.totalInstanceFollowers).to.equal(2)
    expect(data.totalInstanceFollowing).to.equal(1)
  })

  it('Should have the correct stats on instance 2', async function () {
    const res = await getStats(servers[1].url)
    const data: ServerStats = res.body

    expect(data.totalLocalVideoComments).to.equal(0)
    expect(data.totalLocalVideos).to.equal(0)
    expect(data.totalLocalVideoViews).to.equal(0)
    expect(data.totalLocalVideoFilesSize).to.equal(0)
    expect(data.totalUsers).to.equal(1)
    expect(data.totalVideoComments).to.equal(1)
    expect(data.totalVideos).to.equal(1)
    expect(data.totalInstanceFollowers).to.equal(1)
    expect(data.totalInstanceFollowing).to.equal(1)
  })

  it('Should have the correct stats on instance 3', async function () {
    const res = await getStats(servers[2].url)
    const data: ServerStats = res.body

    expect(data.totalLocalVideoComments).to.equal(0)
    expect(data.totalLocalVideos).to.equal(0)
    expect(data.totalLocalVideoViews).to.equal(0)
    expect(data.totalUsers).to.equal(1)
    expect(data.totalVideoComments).to.equal(1)
    expect(data.totalVideos).to.equal(1)
    expect(data.totalInstanceFollowing).to.equal(1)
    expect(data.totalInstanceFollowers).to.equal(0)
  })

  after(async function () {
    killallServers(servers)
  })
})
