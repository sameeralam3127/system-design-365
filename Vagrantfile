Vagrant.configure("2") do |config|

  config.vm.provider "virtualbox" do |vb|
    vb.memory = 1024
    vb.cpus = 1
  end

  config.vm.define "ubuntu1" do |u1|
    u1.vm.box = "ubuntu/jammy64"
    u1.vm.hostname = "ubuntu1"
    u1.vm.network "public_network", bridge: "Wi-Fi"
  end

  config.vm.define "ubuntu2" do |u2|
    u2.vm.box = "ubuntu/jammy64"
    u2.vm.hostname = "ubuntu2"
    u2.vm.network "public_network", bridge: "Wi-Fi"
  end

  config.vm.define "fedora1" do |f1|
    f1.vm.box = "fedora/39-cloud-base"
    f1.vm.hostname = "fedora1"
    f1.vm.network "public_network", bridge: "Wi-Fi"
  end

  config.vm.define "fedora2" do |f2|
    f2.vm.box = "fedora/39-cloud-base"
    f2.vm.hostname = "fedora2"
    f2.vm.network "public_network", bridge: "Wi-Fi"
  end

end
